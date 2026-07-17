"""Roborean FastAPI HTTP API."""

from .app import create_app

__version__ = "0.4.0"

__all__ = ["create_app", "__version__"]
