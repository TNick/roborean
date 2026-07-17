"""Auth stub for Phase 4."""

from dataclasses import dataclass

from fastapi import Request

from .errors import ApiError
from .settings import Settings


@dataclass(frozen=True)
class Principal:
    """Caller identity (stub)."""

    subject: str
    roles: frozenset[str]


def resolve_principal(request: Request, settings: Settings) -> Principal:
    """Resolve the caller from headers or allow anonymous local use."""
    if not settings.require_auth:
        return Principal(subject="anonymous", roles=frozenset({"local"}))
    raw = request.headers.get("X-Roborean-Principal")
    if not raw:
        raise ApiError(
            status_code=401,
            code="E_AUTH",
            message="missing principal",
        )
    return Principal(subject=raw, roles=frozenset({"user"}))
