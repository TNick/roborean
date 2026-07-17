"""Resolve workspace values for document ops."""

from typing import Any

from roborean_spec import PublicLiteral, SecretRefValue, WorkspaceValue

from .errors import DriverError


def public_literal_value(value: WorkspaceValue) -> Any:
    """Extract a public literal payload; reject secrets for previews.

    Args:
        value: Workspace value that may be a literal or secret ref.

    Returns:
        Underlying public literal payload.

    Raises:
        DriverError: When the value is a secret or unsupported kind.
    """
    if isinstance(value, PublicLiteral):
        return value.value

    if isinstance(value, SecretRefValue):
        raise DriverError(
            "secret_ref values cannot be rendered into document previews"
        )

    raise DriverError(f"Unsupported workspace value kind: {value.kind}")


def display_value(value: WorkspaceValue) -> str:
    """Return a redacted display string for previews.

    Args:
        value: Workspace value to render for display.

    Returns:
        Public literal string, secret display hint, or a redacted stub.
    """
    if isinstance(value, PublicLiteral):
        return str(value.value)

    if isinstance(value, SecretRefValue):
        return value.display_hint or "***"

    return "***"
