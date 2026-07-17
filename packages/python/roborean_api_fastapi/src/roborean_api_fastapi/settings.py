"""Application settings."""

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the Roborean API.

    Attributes:
        model_config: Pydantic settings config (``ROBOREAN_`` env prefix).
        storage_backend: Persistence backend (``dict`` or ``sqlalchemy``).
        store_path: Filesystem root for the dict storage backend.
        database_url: SQLAlchemy URL when ``storage_backend`` is sqlalchemy.
        artifact_root: Directory for durable run artifact bytes.
        cors_origins: Allowed browser origins for CORS middleware.
        require_auth: When true, require ``X-Roborean-Principal``.
    """

    model_config = SettingsConfigDict(env_prefix="ROBOREAN_")

    storage_backend: Literal["dict", "sqlalchemy"] = "dict"
    store_path: Path = Path("playground/api-store")
    database_url: str | None = None
    artifact_root: Path = Path("playground/api-artifacts")
    cors_origins: list[str] = ["http://localhost:5173"]
    require_auth: bool = False


def load_settings() -> Settings:
    """Load settings from environment variables.

    Returns:
        Populated ``Settings`` instance.
    """
    return Settings()
