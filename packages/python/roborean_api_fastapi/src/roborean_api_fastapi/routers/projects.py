"""Project CRUD routes."""

from fastapi import APIRouter, Depends, Response, status

from ..deps import AppState, get_principal, get_state
from ..errors import ApiError
from ..schemas.projects import (
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)
from ..schemas.templates import TemplateContentResponse, TemplateContentUpdate
from ..security import Principal
from ..services import project_service, template_service

router = APIRouter(prefix="/v1/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary])
def list_projects(
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> list[ProjectSummary]:
    """List project summaries.

    Args:
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Summary rows for each stored project.
    """
    return project_service.list_projects(state.projects)


@router.post(
    "", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED
)
def create_project(
    body: ProjectCreate,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> ProjectDetail:
    """Create a stored project.

    Args:
        body: Create request containing the project document.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Redacted project detail for the created project.
    """
    return project_service.create_project(state.projects, body)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: str,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> ProjectDetail:
    """Fetch one project.

    Args:
        project_id: Identifier of the project to load.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Redacted project detail for the requested project.
    """
    return project_service.get_project(state.projects, project_id)


@router.put("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: str,
    body: ProjectUpdate,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> ProjectDetail:
    """Replace a project.

    Args:
        project_id: Identifier from the URL path.
        body: Update request containing the replacement project.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Redacted project detail for the updated project.

    Raises:
        ApiError: When the body project id does not match the URL.
    """
    try:
        return project_service.update_project(state.projects, project_id, body)
    except ValueError as error:
        raise ApiError(
            status_code=400,
            code="E_SCHEMA",
            message=str(error),
        ) from error


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> Response:
    """Delete a project.

    Args:
        project_id: Identifier of the project to delete.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Empty response with HTTP 204 status.
    """
    project_service.delete_project(state.projects, project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{project_id}/templates/{template_id}/content",
    response_model=TemplateContentResponse,
)
def get_template_content(
    project_id: str,
    template_id: str,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> TemplateContentResponse:
    """Fetch one template file for a stored project.

    Args:
        project_id: Identifier of the project to load.
        template_id: Template identifier from the project table.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Template file bytes and optional UTF-8 text body.
    """
    try:
        return template_service.get_template_content(
            state.projects,
            project_id,
            template_id,
        )
    except ValueError as error:
        raise ApiError(
            status_code=400,
            code="E_SCHEMA",
            message=str(error),
        ) from error


@router.put(
    "/{project_id}/templates/{template_id}/content",
    response_model=TemplateContentResponse,
)
def put_template_content(
    project_id: str,
    template_id: str,
    body: TemplateContentUpdate,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> TemplateContentResponse:
    """Replace one template file for a stored project.

    Args:
        project_id: Identifier of the project to update.
        template_id: Template identifier from the project table.
        body: Template bytes or UTF-8 text to persist.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Stored template file metadata.
    """
    try:
        return template_service.put_template_content(
            state.projects,
            project_id,
            template_id,
            body,
        )
    except ValueError as error:
        raise ApiError(
            status_code=400,
            code="E_SCHEMA",
            message=str(error),
        ) from error


@router.delete(
    "/{project_id}/templates/{template_id}/content",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_template_content(
    project_id: str,
    template_id: str,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> Response:
    """Delete one template file from project storage.

    Args:
        project_id: Identifier of the project to update.
        template_id: Template identifier from the project table.
        state: Shared repositories and run service.
        _principal: Resolved caller identity (auth stub).

    Returns:
        Empty response with HTTP 204 status.
    """
    try:
        template_service.delete_template_content(
            state.projects,
            project_id,
            template_id,
        )
    except ValueError as error:
        raise ApiError(
            status_code=400,
            code="E_SCHEMA",
            message=str(error),
        ) from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
