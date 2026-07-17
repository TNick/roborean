"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from .deps import attach_app_state
from .errors import install_exception_handlers
from .openapi.customize import customize_openapi
from .routers import artifacts, compile, health, previews, projects, runs
from .settings import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the Roborean HTTP API."""
    app = FastAPI(title="Roborean API", version="0.4.0")
    resolved = attach_app_state(app, settings)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    install_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(projects.router)
    app.include_router(compile.router)
    app.include_router(runs.router)
    app.include_router(artifacts.router)
    app.include_router(previews.router)

    def custom_openapi() -> dict:
        if app.openapi_schema:
            return app.openapi_schema
        schema = get_openapi(
            title=app.title,
            version=app.version,
            routes=app.routes,
        )
        app.openapi_schema = customize_openapi(schema)
        return app.openapi_schema

    app.openapi = custom_openapi
    _ = resolved
    return app
