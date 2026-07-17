"""Test-only bit with a network effect class for retry policy checks."""

from roborean_spec import WorkspacePatch

from .base import BitContext, BitOutput


class FakeNetworkHandler:
    """Return an empty patch while advertising network effects."""

    def execute(self, context: BitContext) -> BitOutput:
        """Execute without workspace changes."""
        return BitOutput(WorkspacePatch(ops=[]), [], [])
