"""Run and compile API models."""

from typing import Any

from pydantic import Field

from .common import ApiModel


class CompileRequest(ApiModel):
    """Optional compile flags."""

    strict_undeclared_access: bool = Field(
        default=True, alias="strictUndeclaredAccess"
    )


class CompileResponse(ApiModel):
    """Compiled project snapshot."""

    compiled: dict[str, Any]


class RunCreate(ApiModel):
    """Body for POST /runs."""

    dry_run: bool = Field(default=False, alias="dryRun")
    stop_on_bit_error: bool = Field(default=True, alias="stopOnBitError")
    workspace_overrides: dict[str, Any] = Field(
        default_factory=dict, alias="workspaceOverrides"
    )
    strict_workspace_access: bool = Field(
        default=True, alias="strictWorkspaceAccess"
    )


class RunSummary(ApiModel):
    """Run list item."""

    run_id: str = Field(alias="runId")
    project_id: str = Field(alias="projectId")
    status: str
    created_at: str = Field(alias="createdAt")
    finished_at: str | None = Field(default=None, alias="finishedAt")


class RunDetail(ApiModel):
    """Redacted durable run."""

    run_id: str = Field(alias="runId")
    project_id: str = Field(alias="projectId")
    status: str
    results: dict[str, Any] | None = None
    diff: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
