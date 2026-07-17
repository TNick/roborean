"""Store-backed durable run orchestration."""

import logging
import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from roborean_spec import (
    RunError,
    RunRecord,
    RunRequest,
    RunStatus,
    RunTrigger,
)
from roborean_storage_base import (
    ArtifactStore,
    ConflictError,
    ProjectRepository,
    RunRepository,
)

from .bits.registry import BitTypeRegistry, builtin_registry
from .compiler import CompileError, CompileOptions, compile_project
from .diff import build_run_diff
from .idempotency import normalize_idempotency_key, request_body_digest
from .retry import decide_retry, retry_policy_snapshot
from .runner import RunOptions, run_project_detailed
from .secrets.port import SecretResolver
from .version import ENGINE_VERSION

logger = logging.getLogger(__name__)


@dataclass
class RunService:
    """Create, execute, and retry durable runs through storage ports."""

    projects: ProjectRepository
    runs: RunRepository
    artifacts: ArtifactStore
    registry: BitTypeRegistry | None = None
    secrets: SecretResolver | None = None
    package_dir_for_project: Callable[[str], Path | None] | None = None
    clock: Callable[[], datetime] = lambda: datetime.now(UTC)
    id_factory: Callable[[], str] = lambda: str(uuid.uuid4())

    def create_and_execute(self, request: RunRequest) -> RunRecord:
        """Idempotently create and execute a run for ``request``."""
        key = normalize_idempotency_key(request.idempotency_key)
        digest = request_body_digest(request)
        existing = self.runs.get_by_idempotency(request.project_id, key)
        if existing is not None:
            if existing.request_digest and existing.request_digest != digest:
                raise ConflictError(
                    "idempotency key reused with a different request body"
                )
            return existing

        if request.project_revision:
            project = self.projects.get_revision(
                request.project_id, request.project_revision
            )
            revision = request.project_revision
        else:
            project = self.projects.get(request.project_id)
            revision = "1"

        registry = self.registry or builtin_registry()
        now = self.clock().isoformat()
        run_id = self.id_factory()
        record = RunRecord(
            runId=run_id,
            idempotencyKey=key,
            projectId=project.id,
            projectRevision=revision,
            compiledDigest="",
            status=RunStatus.QUEUED,
            request=request.model_copy(
                update={"idempotency_key": key, "requested_at": now}
            ),
            attempt=1,
            retryPolicySnapshot=retry_policy_snapshot(project),
            engineVersion=ENGINE_VERSION,
            pluginVersions={},
            createdAt=now,
            requestDigest=digest,
        )
        self.runs.save(record)

        # Transition to running before pure execution.
        started = self.clock().isoformat()
        record = record.model_copy(
            update={"status": RunStatus.RUNNING, "started_at": started}
        )
        self.runs.update(record)

        try:
            package_dir = None
            if self.package_dir_for_project is not None:
                package_dir = self.package_dir_for_project(project.id)
            compiled = compile_project(
                project,
                bit_registry=registry,
                options=CompileOptions(package_dir=package_dir),
            )
            outcome = run_project_detailed(
                compiled,
                project,
                registry=registry,
                options=RunOptions(
                    run_id=run_id,
                    workspace_overrides=dict(request.workspace_overrides),
                    strict_workspace_access=request.strict_workspace_access,
                    package_dir=package_dir,
                ),
            )
            self._persist_run_artifacts(run_id, outcome)
            diff = build_run_diff(
                outcome.input_workspace,
                outcome.final_workspace,
                outcome.results,
            )
            finished = self.clock().isoformat()
            status = (
                RunStatus.SUCCEEDED
                if outcome.results.status == "success"
                else RunStatus.FAILED
            )
            error = None
            if status is RunStatus.FAILED:
                failed = next(
                    (
                        item
                        for item in outcome.results.bit_results
                        if item.status == "failed"
                    ),
                    None,
                )
                error = RunError(
                    code="E_RUN_FAILED",
                    message="One or more bits failed",
                    bitId=None if failed is None else failed.bit_id,
                )
            record = record.model_copy(
                update={
                    "compiled_digest": compiled.digest,
                    "plugin_versions": compiled.plugin_versions,
                    "results": outcome.results,
                    "diff": diff,
                    "status": status,
                    "finished_at": finished,
                    "error": error,
                }
            )
            self.runs.update(record)
            return record
        except CompileError as error:
            logger.debug("Compile failed for run %s", run_id, exc_info=True)
            finished = self.clock().isoformat()
            record = record.model_copy(
                update={
                    "status": RunStatus.FAILED,
                    "finished_at": finished,
                    "error": RunError(
                        code="E_COMPILE",
                        message=str(error),
                    ),
                }
            )
            self.runs.update(record)
            return record
        except Exception as error:
            logger.debug("Run %s failed", run_id, exc_info=True)
            finished = self.clock().isoformat()
            record = record.model_copy(
                update={
                    "status": RunStatus.FAILED,
                    "finished_at": finished,
                    "error": RunError(
                        code="E_RUN",
                        message=str(error),
                    ),
                }
            )
            self.runs.update(record)
            raise

    def _persist_run_artifacts(self, run_id: str, outcome) -> None:
        """Store generated document bytes for later download."""
        for document_id, payload in outcome.artifact_payloads.items():
            media_type = "application/octet-stream"
            for item in outcome.results.artifacts:
                if isinstance(item, dict):
                    if item.get("documentId") == document_id:
                        media_type = str(
                            item.get("mediaType", media_type)
                        )
                        break
            key = f"{run_id}/{document_id}"
            self.artifacts.put_bytes(key, payload, content_type=media_type)

    def retry(self, run_id: str, *, force: bool = False) -> RunRecord:
        """Retry a previous run when effect classes allow it."""
        original = self.runs.get(run_id)
        if original.request.project_revision:
            project = self.projects.get_revision(
                original.project_id, original.request.project_revision
            )
        else:
            project = self.projects.get(original.project_id)
        registry = self.registry or builtin_registry()
        compiled = compile_project(project, bit_registry=registry)
        decision = decide_retry(project, compiled, force=force)
        if not decision.allowed:
            raise ConflictError(f"Retry forbidden: {decision.reason}")

        attempt = original.attempt + 1
        retry_key = f"{original.idempotency_key}:retry:{attempt}"
        request = original.request.model_copy(
            update={
                "idempotency_key": retry_key,
                "trigger": RunTrigger.RETRY,
                "retry_of_run_id": original.run_id,
            }
        )
        return self.create_and_execute(request)

    def get(self, run_id: str) -> RunRecord:
        """Load one durable run."""
        return self.runs.get(run_id)

    def list_for_project(
        self, project_id: str, *, limit: int = 50
    ) -> list[RunRecord]:
        """List durable runs for a project."""
        return self.runs.list_for_project(project_id, limit=limit)
