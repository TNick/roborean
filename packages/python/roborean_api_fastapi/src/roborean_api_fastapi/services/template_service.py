"""Project template file helpers."""

import base64

from roborean_spec import Project
from roborean_storage_base import NotFoundError, ProjectRepository

from ..schemas.templates import TemplateContentResponse, TemplateContentUpdate


def _template_path(project: Project, template_id: str) -> str:
    """Resolve a template id to its package-relative path.

    Args:
        project: Project owning the templates table.
        template_id: Template identifier.

    Returns:
        Relative path for the template file.

    Raises:
        ValueError: When the template id is unknown.
    """
    for entry in project.templates:
        if entry.get("id") == template_id:
            path = entry.get("path")
            if isinstance(path, str) and path:
                return path
    raise ValueError(f"Unknown template id: {template_id}")


def get_template_content(
    repo: ProjectRepository,
    project_id: str,
    template_id: str,
) -> TemplateContentResponse:
    """Load one template file for a project.

    Args:
        repo: Project persistence port with optional file methods.
        project_id: Stored project identifier.
        template_id: Template identifier from the project table.

    Returns:
        Template bytes encoded as base64 plus a text hint when UTF-8.

    Raises:
        NotFoundError: When the project or template file is missing.
        ValueError: When the template id is unknown.
    """
    project = repo.get(project_id)
    relative_path = _template_path(project, template_id)
    get_file = getattr(repo, "get_file", None)
    if not callable(get_file):
        raise NotFoundError(relative_path)
    data = get_file(project_id, relative_path)
    text: str | None = None
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = None
    return TemplateContentResponse(
        templateId=template_id,
        path=relative_path,
        contentBase64=base64.b64encode(data).decode("ascii"),
        text=text,
    )


def put_template_content(
    repo: ProjectRepository,
    project_id: str,
    template_id: str,
    body: TemplateContentUpdate,
) -> TemplateContentResponse:
    """Persist one template file for a project.

    Args:
        repo: Project persistence port with optional file methods.
        project_id: Stored project identifier.
        template_id: Template identifier from the project table.
        body: Raw bytes or UTF-8 text to write.

    Returns:
        Stored template payload metadata.

    Raises:
        NotFoundError: When the project is missing.
        ValueError: When the template id is unknown or body is empty.
    """
    project = repo.get(project_id)
    relative_path = _template_path(project, template_id)
    put_file = getattr(repo, "put_file", None)
    if not callable(put_file):
        raise ValueError("Project storage does not support template files")

    if body.text is not None:
        data = body.text.encode("utf-8")
    elif body.content_base64:
        data = base64.b64decode(body.content_base64)
    else:
        raise ValueError("Template content requires text or contentBase64")

    put_file(project_id, relative_path, data)
    text: str | None = None
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        text = None
    return TemplateContentResponse(
        templateId=template_id,
        path=relative_path,
        contentBase64=base64.b64encode(data).decode("ascii"),
        text=text,
    )


def delete_template_content(
    repo: ProjectRepository,
    project_id: str,
    template_id: str,
) -> None:
    """Remove one template file from project storage.

    Args:
        repo: Project persistence port with optional file methods.
        project_id: Stored project identifier.
        template_id: Template identifier from the project table.

    Raises:
        NotFoundError: When the project is missing.
        ValueError: When the template id is unknown.
    """
    project = repo.get(project_id)
    relative_path = _template_path(project, template_id)
    delete_file = getattr(repo, "delete_file", None)
    if callable(delete_file):
        delete_file(project_id, relative_path)
