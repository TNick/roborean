"""Run routes."""

from fastapi import APIRouter, Depends, Header

from ..deps import AppState, get_principal, get_state
from ..errors import ApiError
from ..schemas.runs import RunCreate, RunDetail, RunSummary
from ..security import Principal
from ..services import run_service

router = APIRouter(tags=["runs"])


@router.post(
    "/v1/projects/{project_id}/runs",
    response_model=RunDetail,
    status_code=201,
)
def create_run(
    project_id: str,
    body: RunCreate,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> RunDetail:
    """Execute a durable run.

    Args:
        project_id: Project that owns the new run.
        body: Run create request with workspace overrides.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).
        idempotency_key: Required ``Idempotency-Key`` header value.

    Returns:
        Client-facing detail for the created or reused run.

    Raises:
        ApiError: When the idempotency header is missing.
    """
    # Durable runs require a client-supplied idempotency key.
    if not idempotency_key:
        raise ApiError(
            status_code=400,
            code="E_IDEMPOTENCY",
            message="Idempotency-Key header is required",
        )

    return run_service.create_run(
        state.run_service,
        project_id,
        body,
        idempotency_key=idempotency_key,
    )


@router.get(
    "/v1/projects/{project_id}/runs",
    response_model=list[RunSummary],
)
def list_runs(
    project_id: str,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> list[RunSummary]:
    """List runs for a project.

    Args:
        project_id: Project whose runs should be listed.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Summary rows for recent runs of the project.
    """
    return run_service.list_runs(state.run_service, project_id)


@router.get("/v1/runs/{run_id}", response_model=RunDetail)
def get_run(
    run_id: str,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> RunDetail:
    """Fetch one run.

    Args:
        run_id: Identifier of the run to load.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Client-facing run detail with redacted results.
    """
    return run_service.get_run(state.run_service, run_id)
