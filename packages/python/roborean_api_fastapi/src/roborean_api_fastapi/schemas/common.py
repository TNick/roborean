"""Shared API DTOs."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    """Base model with alias support."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class DiagnosticDto(ApiModel):
    """One compile or validation diagnostic."""

    severity: Literal["error", "warning", "info"]
    code: str
    message: str
    path: str | None = None


class ErrorBody(ApiModel):
    """Standard error envelope."""

    code: str
    message: str
    diagnostics: list[DiagnosticDto] = Field(default_factory=list)


class IdempotencyKey(ApiModel):
    """Document idempotency header usage."""

    key: str = Field(alias="idempotencyKey")
