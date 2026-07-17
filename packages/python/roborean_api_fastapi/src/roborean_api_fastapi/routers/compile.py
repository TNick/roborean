"""Compile route."""

from fastapi import APIRouter, Depends
from roborean_engine.bits.registry import BitTypeRegistry

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
    registry: BitTypeRegistry = Depends(get_bit_registry),
    _principal: Principal = Depends(get_principal),
) -> CompileResponse:
    """Compile a stored project.

    Args:
        project_id: Identifier of the project to compile.
        body: Optional compile flags; defaults when omitted.
        state: Shared repositories and run service.
        registry: Bit type registry used by the compiler.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Compiled project snapshot for the client.
    """
    request = body or CompileRequest()

    # Resolve an on-disk package directory when the dict backend is used.
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
