"""Preview API models."""

from typing import Any, Literal

from pydantic import Field

from .common import ApiModel, DiagnosticDto


class PreviewRequest(ApiModel):
    """Preview one document definition.

    Attributes:
        document_id: Document definition id to preview (``documentId``).
        workspace_overrides: Optional workspace values for the dry run
            (``workspaceOverrides``).
    """

    document_id: str = Field(alias="documentId")
    workspace_overrides: dict[str, Any] = Field(
        default_factory=dict, alias="workspaceOverrides"
    )


class PreviewResponse(ApiModel):
    """Browser-safe preview payload.

    Attributes:
        document_id: Document definition id that was previewed
            (``documentId``).
        kind: Preview body format returned to the client.
        body: Preview content (string or structured JSON).
        warnings: Non-fatal diagnostics from preview generation.
    """

    document_id: str = Field(alias="documentId")
    kind: Literal["html", "text", "sheet-json", "drawing-json", "unsupported"]
    body: Any
    warnings: list[DiagnosticDto] = Field(default_factory=list)
