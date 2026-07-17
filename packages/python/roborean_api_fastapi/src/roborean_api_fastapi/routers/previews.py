"""Preview route."""

from fastapi import APIRouter, Depends

from ..deps import AppState, get_principal, get_state
from ..schemas.previews import PreviewRequest, PreviewResponse
from ..security import Principal
from ..services import preview_service

router = APIRouter(prefix="/v1/projects", tags=["previews"])


@router.post("/{project_id}/preview", response_model=PreviewResponse)
def preview_document(
    project_id: str,
    body: PreviewRequest,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> PreviewResponse:
    """Return a browser-safe document preview.

    Args:
        project_id: Identifier of the project to preview.
        body: Preview request with document id and overrides.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Preview payload for the requested document.
    """
    # Resolve an on-disk package directory when the dict backend is used.
    package_dir = None
    if state.run_service.package_dir_for_project:
        package_dir = state.run_service.package_dir_for_project(project_id)

    return preview_service.build_preview(
        state.projects,
        project_id,
        body,
        package_dir=package_dir,
    )
