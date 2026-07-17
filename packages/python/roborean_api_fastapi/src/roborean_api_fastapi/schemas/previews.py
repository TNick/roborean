"""Preview API models."""

from typing import Any, Literal

from pydantic import Field

from .common import ApiModel, DiagnosticDto


class PreviewRequest(ApiModel):
    """Preview one document definition."""

    document_id: str = Field(alias="documentId")
    workspace_overrides: dict[str, Any] = Field(
        default_factory=dict, alias="workspaceOverrides"
    )


class PreviewResponse(ApiModel):
    """Browser-safe preview payload."""

    document_id: str = Field(alias="documentId")
    kind: Literal["html", "text", "sheet-json", "drawing-json", "unsupported"]
    body: Any
    warnings: list[DiagnosticDto] = Field(default_factory=list)
