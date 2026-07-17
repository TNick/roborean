"""Sequential runner for compiled Roborean projects."""

import time
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path

from roborean_documents_base import DocumentSessionManager, write_artifact
from roborean_documents_base.template_store import DocumentTemplateStore
from roborean_spec import (
    ArtifactRecord,
    BitResult,
    CompiledProject,
    Project,
    RunResults,
    WorkspacePatch,
    WorkspaceValue,
)

from .bits.base import BitContext
from .bits.registry import BitTypeRegistry, builtin_registry
from .diagnostics import (
    E_CONST_WRITE,
    E_RULE_EVAL,
    E_UNDECLARED_WRITE,
    Diagnostic,
)
from .documents import default_driver_registry
from .patch_apply import apply_patch
from .rules.evaluator import RuleEvalError, evaluate_rule
from .rules.profile import RULE_PROFILE_VERSION
from .version import ENGINE_VERSION
from .workspace import WorkspaceSnapshot, initial_snapshot, workspace_hash


@dataclass(frozen=True)
class RunOptions:
    """Controls an individual project run.

    Attributes:
        run_id: Identifier to stamp on results; a random one is used
            when unset.
        dry_run: Reserved flag for dry-run execution.
        stop_on_bit_error: When ``True``, stop the run at the first
            failed bit regardless of its error policy.
        workspace_overrides: Workspace values to apply on top of the
            project's initial snapshot before execution.
        strict_workspace_access: Reserved flag for strict workspace
            access enforcement.
        package_dir: On-disk package directory used to resolve document
            templates, when the project defines documents.
        artifact_root: Directory to write finalized document artifacts
            to, when set.
    """

    run_id: str | None = None
    dry_run: bool = False
    stop_on_bit_error: bool = True
    workspace_overrides: dict[str, WorkspaceValue] = field(default_factory=dict)
    strict_workspace_access: bool = True
    package_dir: Path | None = None
    artifact_root: Path | None = None


@dataclass(frozen=True)
class RunOutcome:
    """Pure execution results plus snapshots for durable diffs.

    Attributes:
        results: Portable run results (status, bit results, artifacts).
        input_workspace: Workspace snapshot before execution.
        final_workspace: Workspace snapshot after execution.
        artifact_payloads: Generated document bytes keyed by document
            ID.
        previews: Document previews keyed by document ID.
    """

    results: RunResults
    input_workspace: WorkspaceSnapshot
    final_workspace: WorkspaceSnapshot
    artifact_payloads: dict[str, bytes] = field(default_factory=dict)
    previews: dict = field(default_factory=dict)


def _apply_overrides(
    snapshot: WorkspaceSnapshot,
    overrides: dict[str, WorkspaceValue],
) -> WorkspaceSnapshot:
    """Return a new snapshot with non-destructive overrides applied.

    Args:
        snapshot: Workspace snapshot to apply overrides on top of.
        overrides: Workspace values to merge into the snapshot.

    Returns:
        The original snapshot when there are no overrides, otherwise a
        new snapshot with the overrides merged in.
    """
    if not overrides:
        return snapshot
    values = dict(snapshot.values)
    values.update(overrides)
    return WorkspaceSnapshot(
        values=values,
        provenance=dict(snapshot.provenance),
    )


def run_project_detailed(
    compiled: CompiledProject,
    project: Project,
    *,
    registry: BitTypeRegistry | None = None,
    options: RunOptions | None = None,
) -> RunOutcome:
    """Run compiled bits and return results with workspace snapshots.

    Args:
        compiled: Compiled project produced by ``compile_project``.
        project: Project definition being executed.
        registry: Bit type registry; falls back to the builtin registry
            when unset.
        options: Run options controlling overrides, stop behavior, and
            document/artifact handling.

    Returns:
        The run outcome, including results, workspace snapshots,
        artifact payloads, and document previews.
    """
    # Resolve defaults for options and the bit registry.
    options = options or RunOptions()
    registry = registry or builtin_registry()

    # Capture the run start time and build the initial workspace
    # snapshot, applying any requested overrides.
    started = datetime.now(UTC)
    snapshot = _apply_overrides(
        initial_snapshot(project), options.workspace_overrides
    )
    input_snapshot = snapshot
    input_hash = workspace_hash(snapshot)

    # Track const variable keys so writes to them can be rejected.
    const_keys = {
        variable.key for variable in project.variables if variable.const
    }

    # Initialize per-run accumulators for bit results, status, and
    # document/artifact state.
    bit_results: list[BitResult] = []
    status = "success"
    sessions: DocumentSessionManager | None = None
    artifact_payloads: dict[str, bytes] = {}
    artifacts: list[ArtifactRecord] = []

    # Open document sessions when the project defines documents and a
    # package directory is available to resolve templates.
    if project.documents and options.package_dir is not None:
        store = DocumentTemplateStore(options.package_dir, project)
        sessions = DocumentSessionManager(
            registry=default_driver_registry(),
            store=store,
        )
        sessions.open_all(project, compiled, snapshot)

    # Execute ordered bits; stop when the error policy requires it.
    for bit in project.bits:
        # Track per-bit timing, patch, and diagnostics state.
        began = time.perf_counter()
        patch = WorkspacePatch(ops=[])
        document_ops: list = []
        diagnostics: list[Diagnostic] = []
        active = True
        reason: bool | str = "always"
        try:
            # Evaluate activation and skip inactive bits.
            rule = compiled.activation_expressions[bit.id]
            if bit.when is not True:
                reason = evaluate_rule(rule, snapshot)
                active = bool(reason)
            if not active:
                bit_results.append(
                    BitResult(
                        bitId=bit.id,
                        type=bit.type,
                        active=False,
                        activationReason=False,
                        status="inactive",
                        durationMs=(time.perf_counter() - began) * 1000,
                        workspacePatch=patch,
                        documentOps=[],
                        diagnostics=[],
                        pluginVersion=compiled.plugin_versions[bit.type],
                    )
                )
                continue

            # Execute the bit handler and apply its workspace patch.
            _, handler = registry.get(bit.type)
            output = handler.execute(BitContext(bit, snapshot, compiled))
            snapshot, patch = apply_patch(
                snapshot,
                output.patch,
                allowed_writes=set(bit.writes),
                const_keys=const_keys,
                bit_id=bit.id,
            )

            # Apply document operations and collect diagnostics emitted
            # by the handler.
            document_ops = list(output.document_ops)
            if sessions is not None:
                for op in document_ops:
                    sessions.apply(op)
            diagnostics.extend(output.diagnostics)

            # Turn rejected patch operations into diagnostics.
            for operation in patch.ops:
                if operation.op == "reject":
                    code = (
                        E_CONST_WRITE
                        if operation.reason == "const variable"
                        else E_UNDECLARED_WRITE
                    )
                    diagnostics.append(
                        Diagnostic("error", code, operation.reason)
                    )
            result_status = "failed" if diagnostics else "success"
        except RuleEvalError as error:
            diagnostics.append(Diagnostic("error", E_RULE_EVAL, str(error)))
            result_status = "failed"
        except KeyError as error:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_UNDECLARED_WRITE,
                    f"Missing bit value: {error}",
                )
            )
            result_status = "failed"

        bit_results.append(
            BitResult(
                bitId=bit.id,
                type=bit.type,
                active=active,
                activationReason=reason,
                status=result_status,
                durationMs=(time.perf_counter() - began) * 1000,
                workspacePatch=patch,
                documentOps=document_ops,
                diagnostics=[item.to_dict() for item in diagnostics],
                pluginVersion=compiled.plugin_versions.get(bit.type, ""),
            )
        )
        if result_status == "failed":
            status = "failed"
            if options.stop_on_bit_error or bit.on_error.value == "abort":
                break

    # Finalize documents and collect previews/payloads on success.
    previews: dict = {}
    if sessions is not None and status == "success":
        artifacts = sessions.finalize_all()
        artifact_payloads = sessions.payloads()
        previews = {
            key: value.model_dump(mode="json", by_alias=True)
            for key, value in sessions.previews().items()
        }
        if options.artifact_root is not None:
            for record in artifacts:
                payload = artifact_payloads[record.document_id]
                write_artifact(options.artifact_root / record.path, payload)

    # Record time-dependent fields only at the run boundary.
    finished = datetime.now(UTC)
    results = RunResults(
        runId=options.run_id or str(uuid.uuid4()),
        projectId=project.id,
        projectDigest=compiled.digest,
        startedAt=started.isoformat(),
        finishedAt=finished.isoformat(),
        status=status,
        inputWorkspaceHash=input_hash,
        finalWorkspaceHash=workspace_hash(snapshot),
        bitResults=bit_results,
        artifacts=[
            item.model_dump(mode="json", by_alias=True) for item in artifacts
        ],
        engineVersion=ENGINE_VERSION,
        ruleProfileVersion=RULE_PROFILE_VERSION,
    )
    return RunOutcome(
        results=results,
        input_workspace=input_snapshot,
        final_workspace=snapshot,
        artifact_payloads=artifact_payloads,
        previews=previews,
    )


def run_project(
    compiled: CompiledProject,
    project: Project,
    *,
    registry: BitTypeRegistry | None = None,
    options: RunOptions | None = None,
) -> RunResults:
    """Run compiled bits in source order against a copy-on-write workspace.

    Args:
        compiled: Compiled project produced by ``compile_project``.
        project: Project definition being executed.
        registry: Bit type registry; falls back to the builtin registry
            when unset.
        options: Run options controlling overrides, stop behavior, and
            document/artifact handling.

    Returns:
        The portable run results, without workspace snapshots or
        artifact payloads.
    """
    return run_project_detailed(
        compiled, project, registry=registry, options=options
    ).results
