"""Project persistence service."""

from roborean_spec import Project
from roborean_storage_base import ProjectRepository

from ..redaction import redact_project_for_client
from ..schemas.projects import (
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)


def list_projects(repo: ProjectRepository) -> list[ProjectSummary]:
    """List stored project ids."""
    rows = []
    for project_id in repo.list_ids():
        project = repo.get(project_id)
        rows.append(
            ProjectSummary(
                id=project.id,
                name=project.name,
                schemaVersion=project.schema_version,
            )
        )
    return rows


def _coerce_project(value: Project | dict) -> Project:
    """Ensure a project model instance."""
    if isinstance(value, Project):
        return value
    return Project.model_validate(value)


def create_project(
    repo: ProjectRepository, body: ProjectCreate
) -> ProjectDetail:
    """Validate and store a new project."""
    project = _coerce_project(body.project)
    repo.save(project, revision="1")
    return ProjectDetail(project=redact_project_for_client(project))


def get_project(repo: ProjectRepository, project_id: str) -> ProjectDetail:
    """Load one redacted project."""
    project = repo.get(project_id)
    return ProjectDetail(project=redact_project_for_client(project))


def update_project(
    repo: ProjectRepository,
    project_id: str,
    body: ProjectUpdate,
) -> ProjectDetail:
    """Replace a stored project."""
    project = _coerce_project(body.project)
    if project.id != project_id:
        raise ValueError("project.id must match URL project_id")
    repo.save(project, revision="1")
    return ProjectDetail(project=redact_project_for_client(project))


def delete_project(repo: ProjectRepository, project_id: str) -> None:
    """Remove a project package."""
    repo.delete(project_id)
