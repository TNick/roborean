"""FastAPI dependency wiring."""

from dataclasses import dataclass
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from roborean_documents_base import DriverRegistry
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
    """Shared repositories and services.

    Attributes:
        settings: Resolved application settings.
        projects: Project persistence port.
        runs: Durable run persistence port.
        artifacts: Binary artifact store.
        run_service: Store-backed run orchestration service.
    """

    settings: Settings
    projects: ProjectRepository
    runs: RunRepository
    artifacts: ArtifactStore
    run_service: RunService


def build_app_state(settings: Settings) -> AppState:
    """Construct repositories from settings.

    Args:
        settings: Runtime configuration selecting the storage backend.

    Returns:
        Wired ``AppState`` with repositories and a run service.

    Raises:
        ValueError: When sqlalchemy backend is selected without a URL.
    """
    # Build persistence ports for the configured backend.
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

        # Upgrade schema then open session-backed repositories.
        engine = make_engine(settings.database_url)
        upgrade(engine)
        factory = make_session_factory(engine)
        projects = SqlAlchemyProjectRepository(factory)
        runs = SqlAlchemyRunRepository(factory)
        artifacts = DictArtifactStore(settings.artifact_root.resolve())

    def package_dir(project_id: str) -> Path | None:
        """Resolve the on-disk package directory for a project.

        Args:
            project_id: Project identifier used by the repository.

        Returns:
            Package directory path when present for dict storage, else None.
        """
        if isinstance(projects, DictProjectRepository):
            path = projects._project_dir(project_id)
            return path if path.is_dir() else None
        return None

    # Wire the durable run service to the selected ports.
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
    """Return settings attached to the app instance.

    Args:
        request: Incoming request used to reach ``app.state``.

    Returns:
        Application settings bound at startup.
    """
    return request.app.state.roborean_settings


def get_state(request: Request) -> AppState:
    """Return repositories attached to the app instance.

    Args:
        request: Incoming request used to reach ``app.state``.

    Returns:
        Shared ``AppState`` bound at startup.
    """
    return request.app.state.roborean_app_state


def get_principal(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> Principal:
    """Resolve caller identity for the request.

    Args:
        request: Incoming HTTP request.
        settings: Injected application settings.

    Returns:
        Resolved ``Principal`` for authorization stubs.
    """
    return resolve_principal(request, settings)


def get_bit_registry() -> BitTypeRegistry:
    """Return the built-in bit registry.

    Returns:
        Registry of built-in bit type handlers.
    """
    return builtin_registry()


def get_document_registry() -> DriverRegistry:
    """Return installed document drivers.

    Returns:
        Driver registry used for previews and document ops.
    """
    return default_driver_registry()


def attach_app_state(
    app: FastAPI,
    settings: Settings | None = None,
) -> Settings:
    """Bind settings and repositories to a FastAPI app.

    Args:
        app: FastAPI application receiving shared state.
        settings: Optional settings override; loads from the environment
            when omitted.

    Returns:
        Settings instance that was bound to the app.
    """
    resolved = settings or load_settings()
    app.state.roborean_settings = resolved
    app.state.roborean_app_state = build_app_state(resolved)
    return resolved


def reset_state() -> None:
    """No-op placeholder for tests (state lives on app)."""
    return None
