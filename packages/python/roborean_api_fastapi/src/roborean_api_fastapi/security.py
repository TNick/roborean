"""Auth stub for Phase 4."""

from dataclasses import dataclass

from fastapi import Request

from .errors import ApiError
from .settings import Settings


@dataclass(frozen=True)
class Principal:
    """Caller identity (stub).

    Attributes:
        subject: Principal identifier from the auth header or anonymous.
        roles: Granted role names for authorization checks.
    """

    subject: str
    roles: frozenset[str]


def resolve_principal(request: Request, settings: Settings) -> Principal:
    """Resolve the caller from headers or allow anonymous local use.

    Args:
        request: Incoming HTTP request (headers inspected when auth is on).
        settings: Application settings controlling auth requirements.

    Returns:
        Resolved ``Principal`` for the request.

    Raises:
        ApiError: When auth is required and the principal header is missing.
    """
    # Local development may skip auth entirely.
    if not settings.require_auth:
        return Principal(subject="anonymous", roles=frozenset({"local"}))

    # Require an explicit principal header in authenticated mode.
    raw = request.headers.get("X-Roborean-Principal")
    if not raw:
        raise ApiError(
            status_code=401,
            code="E_AUTH",
            message="missing principal",
        )

    return Principal(subject=raw, roles=frozenset({"user"}))
