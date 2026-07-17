"""FastAPI dependency wiring."""

from dataclasses import dataclass
from pathlib import Path

from fastapi import Depends, Request
from roborean_engine import RunService
from roborean_engine.bits.registry import BitTypeRegistry, builtin_registry
from roborean_engine.documents import default_driver_registry
from roborean_storage_base import (
    ArtifactStore,
    ProjectRepository,
    RunRepository,
)
from roborean_storage_dict import (
    DictArtifactStore,
    DictProjectRepository,
    DictRunRepository,
)

from .security import Principal, resolve_principal
from .settings import Settings, load_settings


@dataclass
class AppState:
    """Shared repositories and services."""

    settings: Settings
    projects: ProjectRepository
    runs: RunRepository
    artifacts: ArtifactStore
    run_service: RunService


def build_app_state(settings: Settings) -> AppState:
    """Construct repositories from settings."""
    if settings.storage_backend == "dict":
        root = settings.store_path.expanduser().resolve()
        root.mkdir(parents=True, exist_ok=True)
        projects = DictProjectRepository(root)
        runs = DictRunRepository(root)
        artifacts = DictArtifactStore(settings.artifact_root.resolve())
    else:
        from roborean_storage_sqlalchemy import (
            SqlAlchemyProjectRepository,
            SqlAlchemyRunRepository,
            make_engine,
            make_session_factory,
            upgrade,
        )

        if not settings.database_url:
            raise ValueError("database_url required for sqlalchemy backend")
        engine = make_engine(settings.database_url)
        upgrade(engine)
        factory = make_session_factory(engine)
        projects = SqlAlchemyProjectRepository(factory)
        runs = SqlAlchemyRunRepository(factory)
        artifacts = DictArtifactStore(settings.artifact_root.resolve())

    def package_dir(project_id: str) -> Path | None:
        if isinstance(projects, DictProjectRepository):
            path = projects._project_dir(project_id)
            return path if path.is_dir() else None
        return None

    run_service = RunService(
        projects=projects,
        runs=runs,
        artifacts=artifacts,
        registry=builtin_registry(),
        package_dir_for_project=package_dir,
    )
    return AppState(
        settings=settings,
        projects=projects,
        runs=runs,
        artifacts=artifacts,
        run_service=run_service,
    )


def get_settings(request: Request) -> Settings:
    """Settings attached to the app instance."""
    return request.app.state.roborean_settings


def get_state(request: Request) -> AppState:
    """Repositories attached to the app instance."""
    return request.app.state.roborean_app_state


def get_principal(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> Principal:
    """Resolve caller identity."""
    return resolve_principal(request, settings)


def get_bit_registry() -> BitTypeRegistry:
    """Built-in bit registry."""
    return builtin_registry()


def get_document_registry():
    """Installed document drivers."""
    return default_driver_registry()


def attach_app_state(app, settings: Settings | None = None) -> Settings:
    """Bind settings and repositories to a FastAPI app."""
    resolved = settings or load_settings()
    app.state.roborean_settings = resolved
    app.state.roborean_app_state = build_app_state(resolved)
    return resolved


def reset_state() -> None:
    """No-op placeholder for tests (state lives on app)."""
    return None
