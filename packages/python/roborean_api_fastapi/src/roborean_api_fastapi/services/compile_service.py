"""Compile service."""

from pathlib import Path

from roborean_engine.bits.registry import BitTypeRegistry
from roborean_engine.compiler import CompileOptions, compile_project
from roborean_storage_base import ProjectRepository

from ..schemas.runs import CompileRequest, CompileResponse


def compile_stored_project(
    repo: ProjectRepository,
    project_id: str,
    *,
    body: CompileRequest,
    registry: BitTypeRegistry,
    package_dir: Path | None,
) -> CompileResponse:
    """Compile a stored project package."""
    project = repo.get(project_id)
    compiled = compile_project(
        project,
        bit_registry=registry,
        options=CompileOptions(
            strict_undeclared_access=body.strict_undeclared_access,
            package_dir=package_dir,
        ),
    )
    return CompileResponse(
        compiled=compiled.model_dump(mode="json", by_alias=True)
    )
