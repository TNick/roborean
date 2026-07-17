"""Protocols and context for installed bit implementations."""

from dataclasses import dataclass
from typing import Any, Protocol

from roborean_spec import Bit, CompiledProject, WorkspacePatch

from ..diagnostics import Diagnostic
from ..workspace import WorkspaceSnapshot


@dataclass(frozen=True)
class BitContext:
    """Inputs supplied to a bit handler."""

    bit: Bit
    workspace: WorkspaceSnapshot
    compiled: CompiledProject


@dataclass(frozen=True)
class BitOutput:
    """Patch and diagnostics produced by one bit execution."""

    patch: WorkspacePatch
    diagnostics: list[Diagnostic]
    document_ops: list[Any]


class BitHandler(Protocol):
    """Protocol implemented by deterministic bit handlers."""

    def execute(self, context: BitContext) -> BitOutput:
        """Execute the bit without mutating the workspace."""
