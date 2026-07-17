"""Application settings."""

from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the Roborean API."""

    model_config = SettingsConfigDict(env_prefix="ROBOREAN_")

    storage_backend: Literal["dict", "sqlalchemy"] = "dict"
    store_path: Path = Path("playground/api-store")
    database_url: str | None = None
    artifact_root: Path = Path("playground/api-artifacts")
    cors_origins: list[str] = ["http://localhost:5173"]
    require_auth: bool = False


def load_settings() -> Settings:
    """Load settings from environment."""
    return Settings()
