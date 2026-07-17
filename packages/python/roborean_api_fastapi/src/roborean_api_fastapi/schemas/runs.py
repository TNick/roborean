"""Run and compile API models."""

from typing import Any

from pydantic import Field

from .common import ApiModel


class CompileRequest(ApiModel):
    """Optional compile flags.

    Attributes:
        strict_undeclared_access: When true, reject undeclared bit reads
            and writes (``strictUndeclaredAccess``).
    """

    strict_undeclared_access: bool = Field(
        default=True, alias="strictUndeclaredAccess"
    )


class CompileResponse(ApiModel):
    """Compiled project snapshot.

    Attributes:
        compiled: JSON-serializable compiled project document.
    """

    compiled: dict[str, Any]


class RunCreate(ApiModel):
    """Body for POST /runs.

    Attributes:
        dry_run: When true, execute without durable side effects
            (``dryRun``).
        stop_on_bit_error: Stop the run after the first bit failure
            (``stopOnBitError``).
        workspace_overrides: Optional workspace values for the run
            (``workspaceOverrides``).
        strict_workspace_access: Enforce declared workspace access
            (``strictWorkspaceAccess``).
    """

    dry_run: bool = Field(default=False, alias="dryRun")
    stop_on_bit_error: bool = Field(default=True, alias="stopOnBitError")
    workspace_overrides: dict[str, Any] = Field(
        default_factory=dict, alias="workspaceOverrides"
    )
    strict_workspace_access: bool = Field(
        default=True, alias="strictWorkspaceAccess"
    )


class RunSummary(ApiModel):
    """Run list item.

    Attributes:
        run_id: Durable run identifier (``runId``).
        project_id: Owning project identifier (``projectId``).
        status: Current run status string.
        created_at: ISO-8601 creation timestamp (``createdAt``).
        finished_at: ISO-8601 finish timestamp when complete
            (``finishedAt``).
    """

    run_id: str = Field(alias="runId")
    project_id: str = Field(alias="projectId")
    status: str
    created_at: str = Field(alias="createdAt")
    finished_at: str | None = Field(default=None, alias="finishedAt")


class RunDetail(ApiModel):
    """Redacted durable run.

    Attributes:
        run_id: Durable run identifier (``runId``).
        project_id: Owning project identifier (``projectId``).
        status: Current run status string.
        results: Redacted run results payload, when present.
        diff: Serialized workspace/document diff, when present.
        error: Serialized run error payload, when present.
    """

    run_id: str = Field(alias="runId")
    project_id: str = Field(alias="projectId")
    status: str
    results: dict[str, Any] | None = None
    diff: dict[str, Any] | None = None
    error: dict[str, Any] | None = None
