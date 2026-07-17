"""Document preview service."""

from pathlib import Path

from pydantic import TypeAdapter
from roborean_engine.bits.registry import builtin_registry
from roborean_engine.compiler import CompileOptions, compile_project
from roborean_engine.runner import RunOptions, run_project_detailed
from roborean_spec import WorkspaceValue
from roborean_storage_base import ProjectRepository

from ..schemas.common import DiagnosticDto
from ..schemas.previews import PreviewRequest, PreviewResponse


def build_preview(
    repo: ProjectRepository,
    project_id: str,
    body: PreviewRequest,
    *,
    package_dir: Path | None,
) -> PreviewResponse:
    """Run the project and return a browser-safe preview.

    Args:
        repo: Project persistence port.
        project_id: Identifier of the project to preview.
        body: Preview request with document id and overrides.
        package_dir: Optional on-disk package directory for templates.

    Returns:
        Preview payload for the requested document.
    """
    # Load, compile, and execute the project for preview output.
    project = repo.get(project_id)
    registry = builtin_registry()
    compiled = compile_project(
        project,
        bit_registry=registry,
        options=CompileOptions(package_dir=package_dir),
    )

    # Validate workspace overrides before execution.
    adapter = TypeAdapter(WorkspaceValue)
    overrides = {
        key: adapter.validate_python(value)
        for key, value in body.workspace_overrides.items()
    }
    outcome = run_project_detailed(
        compiled,
        project,
        registry=registry,
        options=RunOptions(
            workspace_overrides=overrides,
            package_dir=package_dir,
        ),
    )

    # Fall back when the driver produced no preview for this document.
    preview = outcome.previews.get(body.document_id)
    if preview is None:
        return PreviewResponse(
            documentId=body.document_id,
            kind="unsupported",
            body="",
            warnings=[
                DiagnosticDto(
                    severity="warning",
                    code="W_PREVIEW_MISSING",
                    message="No preview produced for document",
                )
            ],
        )

    # Map driver preview modes onto the API preview kind enum.
    mode = str(preview.get("mode", "unsupported"))
    kind = "unsupported"
    if mode in ("text", "html", "drawing-json"):
        kind = "html" if mode == "html" else mode
    if mode == "html":
        kind = "html"
    body_value = preview.get("body", "")
    return PreviewResponse(
        documentId=body.document_id,
        kind=kind,
        body=body_value,
        warnings=[],
    )
