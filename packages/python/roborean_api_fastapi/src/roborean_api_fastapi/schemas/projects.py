"""Project API models."""

from typing import Any

from pydantic import Field
from roborean_spec import Project

from .common import ApiModel


class ProjectCreate(ApiModel):
    """Create one stored project.

    Attributes:
        project: Full project document to validate and persist.
    """

    project: Project


class ProjectUpdate(ApiModel):
    """Replace a stored project.

    Attributes:
        project: Replacement project document (id must match the URL).
    """

    project: Project


class ProjectSummary(ApiModel):
    """List row for projects.

    Attributes:
        id: Stable project identifier.
        name: Human-readable project name.
        schema_version: Project schema version (``schemaVersion``).
    """

    id: str
    name: str
    schema_version: str = Field(alias="schemaVersion")


class ProjectDetail(ApiModel):
    """Redacted project payload.

    Attributes:
        project: JSON-serializable project with secrets redacted.
    """

    project: dict[str, Any]
