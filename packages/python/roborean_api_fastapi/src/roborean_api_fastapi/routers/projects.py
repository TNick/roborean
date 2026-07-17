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
from ..security import Principal
from ..services import project_service

router = APIRouter(prefix="/v1/projects", tags=["projects"])


@router.get("", response_model=list[ProjectSummary])
def list_projects(
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> list[ProjectSummary]:
    """List project summaries."""
    return project_service.list_projects(state.projects)


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project(
    body: ProjectCreate,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> ProjectDetail:
    """Create a stored project."""
    return project_service.create_project(state.projects, body)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: str,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> ProjectDetail:
    """Fetch one project."""
    return project_service.get_project(state.projects, project_id)


@router.put("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: str,
    body: ProjectUpdate,
    state: AppState = Depends(get_state),
    _principal: Principal = Depends(get_principal),
) -> ProjectDetail:
    """Replace a project."""
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
    """Delete a project."""
    project_service.delete_project(state.projects, project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
