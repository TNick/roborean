"""Project API models."""

from typing import Any

from pydantic import Field
from roborean_spec import Project

from .common import ApiModel


class ProjectCreate(ApiModel):
    """Create one stored project."""

    project: Project


class ProjectUpdate(ApiModel):
    """Replace a stored project."""

    project: Project


class ProjectSummary(ApiModel):
    """List row for projects."""

    id: str
    name: str
    schema_version: str = Field(alias="schemaVersion")


class ProjectDetail(ApiModel):
    """Redacted project payload."""

    project: dict[str, Any]
