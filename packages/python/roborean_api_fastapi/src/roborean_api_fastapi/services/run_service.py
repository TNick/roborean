"""Run orchestration for the API."""

from pydantic import TypeAdapter
from roborean_engine import RunService
from roborean_spec import RunRecord, RunRequest, RunTrigger, WorkspaceValue

from ..redaction import redact_run_results_for_client
from ..schemas.runs import RunCreate, RunDetail, RunSummary


def _to_detail(record: RunRecord) -> RunDetail:
    """Map a durable record to a client DTO.

    Args:
        record: Persisted run record from storage.

    Returns:
        Client-facing run detail with redacted results.
    """
    # Redact secret-bearing result payloads for browser clients.
    results = None
    if record.results is not None:
        results = redact_run_results_for_client(record.results)

    # Serialize optional diff and error blocks when present.
    diff = None
    if record.diff is not None:
        diff = record.diff.model_dump(mode="json", by_alias=True)
    error = None
    if record.error is not None:
        error = record.error.model_dump(mode="json", by_alias=True)

    return RunDetail(
        runId=record.run_id,
        projectId=record.project_id,
        status=record.status.value,
        results=results,
        diff=diff,
        error=error,
    )


def create_run(
    service: RunService,
    project_id: str,
    body: RunCreate,
    *,
    idempotency_key: str,
) -> RunDetail:
    """Create an idempotent durable run.

    Args:
        service: Store-backed run orchestration service.
        project_id: Project that owns the run.
        body: Run create request with workspace overrides.
        idempotency_key: Client-supplied idempotency key.

    Returns:
        Client-facing detail for the created or reused run.
    """
    # Validate workspace overrides before building the run request.
    adapter = TypeAdapter(WorkspaceValue)
    overrides = {
        key: adapter.validate_python(value)
        for key, value in body.workspace_overrides.items()
    }
    request = RunRequest(
        projectId=project_id,
        projectRevision="1",
        idempotencyKey=idempotency_key,
        trigger=RunTrigger.API,
        workspaceOverrides=overrides,
        strictWorkspaceAccess=body.strict_workspace_access,
    )
    record = service.create_and_execute(request)
    return _to_detail(record)


def get_run(service: RunService, run_id: str) -> RunDetail:
    """Load one run.

    Args:
        service: Store-backed run orchestration service.
        run_id: Identifier of the run to load.

    Returns:
        Client-facing run detail with redacted results.
    """
    return _to_detail(service.get(run_id))


def list_runs(service: RunService, project_id: str) -> list[RunSummary]:
    """List runs for a project.

    Args:
        service: Store-backed run orchestration service.
        project_id: Project whose runs should be listed.

    Returns:
        Summary rows for recent runs, newest first from storage.
    """
    rows = []
    for record in service.list_for_project(project_id):
        rows.append(
            RunSummary(
                runId=record.run_id,
                projectId=record.project_id,
                status=record.status.value,
                createdAt=record.created_at,
                finishedAt=record.finished_at,
            )
        )
    return rows
