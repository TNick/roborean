"""Protocols and context for installed bit implementations."""

from dataclasses import dataclass
from typing import Any, Protocol

from roborean_spec import Bit, CompiledProject, WorkspacePatch

from ..diagnostics import Diagnostic
from ..workspace import WorkspaceSnapshot


@dataclass(frozen=True)
class BitContext:
    """Inputs supplied to a bit handler.

    Attributes:
        bit: Bit definition being executed.
        workspace: Current copy-on-write workspace snapshot.
        compiled: Compiled project artifact for the run.
    """

    bit: Bit
    workspace: WorkspaceSnapshot
    compiled: CompiledProject


@dataclass(frozen=True)
class BitOutput:
    """Patch and diagnostics produced by one bit execution.

    Attributes:
        patch: Proposed workspace patch (applied by the runner).
        diagnostics: Diagnostics emitted during execution.
        document_ops: Document operations to apply to open sessions.
    """

    patch: WorkspacePatch
    diagnostics: list[Diagnostic]
    document_ops: list[Any]


class BitHandler(Protocol):
    """Protocol implemented by deterministic bit handlers."""

    def execute(self, context: BitContext) -> BitOutput:
        """Execute the bit without mutating the workspace.

        Args:
            context: Bit inputs including workspace and compiled project.

        Returns:
            Workspace patch, diagnostics, and document operations.
        """
