"""Health probe."""

from fastapi import APIRouter
from roborean_engine.version import ENGINE_VERSION

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    """Return liveness and engine version.

    Returns:
        Mapping with ``status`` and ``engineVersion`` keys.
    """
    return {"status": "ok", "engineVersion": ENGINE_VERSION}
