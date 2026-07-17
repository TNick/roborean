"""Compile route."""

from fastapi import APIRouter, Depends

from ..deps import AppState, get_bit_registry, get_principal, get_state
from ..schemas.runs import CompileRequest, CompileResponse
from ..security import Principal
from ..services import compile_service

router = APIRouter(prefix="/v1/projects", tags=["compile"])


@router.post("/{project_id}/compile", response_model=CompileResponse)
def compile_project(
    project_id: str,
    body: CompileRequest | None = None,
    state: AppState = Depends(get_state),
    registry=Depends(get_bit_registry),
    _principal: Principal = Depends(get_principal),
) -> CompileResponse:
    """Compile a stored project."""
    request = body or CompileRequest()
    package_dir = None
    if state.run_service.package_dir_for_project:
        package_dir = state.run_service.package_dir_for_project(project_id)
    return compile_service.compile_stored_project(
        state.projects,
        project_id,
        body=request,
        registry=registry,
        package_dir=package_dir,
    )
