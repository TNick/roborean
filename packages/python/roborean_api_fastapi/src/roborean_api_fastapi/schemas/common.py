"""Shared API DTOs."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    """Base model with alias support.

    Attributes:
        model_config: Forbid extras and accept field aliases by name.
    """

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class DiagnosticDto(ApiModel):
    """One compile or validation diagnostic.

    Attributes:
        severity: Diagnostic level (``error``, ``warning``, or ``info``).
        code: Stable machine-readable diagnostic code.
        message: Human-readable diagnostic text.
        path: Optional JSON-pointer-like location within the project.
    """

    severity: Literal["error", "warning", "info"]
    code: str
    message: str
    path: str | None = None


class ErrorBody(ApiModel):
    """Standard error envelope.

    Attributes:
        code: Stable machine-readable error code.
        message: Human-readable failure description.
        diagnostics: Optional compile or validation diagnostics.
    """

    code: str
    message: str
    diagnostics: list[DiagnosticDto] = Field(default_factory=list)


class IdempotencyKey(ApiModel):
    """Document idempotency header usage.

    Attributes:
        key: Client-supplied idempotency key (``idempotencyKey`` alias).
    """

    key: str = Field(alias="idempotencyKey")
