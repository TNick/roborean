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
    """Run the project and return a browser-safe preview."""
    project = repo.get(project_id)
    registry = builtin_registry()
    compiled = compile_project(
        project,
        bit_registry=registry,
        options=CompileOptions(package_dir=package_dir),
    )
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
