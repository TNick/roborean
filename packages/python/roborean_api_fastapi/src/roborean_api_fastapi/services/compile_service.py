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
    """Compile a stored project package.

    Args:
        repo: Project persistence port.
        project_id: Identifier of the project to compile.
        body: Compile options from the HTTP request.
        registry: Bit type registry used by the compiler.
        package_dir: Optional on-disk package directory for templates.

    Returns:
        Compiled project payload for the client.
    """
    # Load the current project revision from storage.
    project = repo.get(project_id)

    # Compile with request-controlled strictness and package path.
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
