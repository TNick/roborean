"""Registry and built-in implementations for Phase 1 bits."""

import json
from pathlib import Path

from pydantic import TypeAdapter
from roborean_spec import (
    BitTypeManifest,
    SetOp,
    WorkspacePatch,
    WorkspaceValue,
)

from ..workspace import get_value
from .append_text import AppendTextHandler
from .base import BitContext, BitHandler, BitOutput
from .drawing_insert_polyline import DrawingInsertPolylineHandler
from .fake_network import FakeNetworkHandler
from .flow_append_paragraph import FlowAppendParagraphHandler
from .raster_draw_text import RasterDrawTextHandler
from .replace_named_value import ReplaceNamedValueHandler
from .sheet_set_cells import SheetSetCellsHandler


class NoopHandler:
    """Produce an empty patch."""

    def execute(self, context: BitContext) -> BitOutput:
        """Execute without changing the workspace.

        Args:
            context: Bit inputs (unused; required by the handler protocol).

        Returns:
            Empty workspace patch with no document operations.
        """
        return BitOutput(WorkspacePatch(ops=[]), [], [])


class SetVariableHandler:
    """Set the configured key to the configured workspace value."""

    def execute(self, context: BitContext) -> BitOutput:
        """Build one set operation.

        Args:
            context: Bit inputs including the target key and value.

        Returns:
            Workspace patch with a single set operation.
        """
        config = context.bit.config
        value = TypeAdapter(WorkspaceValue).validate_python(config["value"])
        return BitOutput(
            WorkspacePatch(
                ops=[SetOp(op="set", key=config["key"], value=value)]
            ),
            [],
            [],
        )


class CopyVariableHandler:
    """Copy a runtime workspace value to another key."""

    def execute(self, context: BitContext) -> BitOutput:
        """Build one set operation using the source value.

        Args:
            context: Bit inputs including source and destination keys.

        Returns:
            Workspace patch that copies ``from`` onto ``to``.
        """
        config = context.bit.config
        return BitOutput(
            WorkspacePatch(
                ops=[
                    SetOp(
                        op="set",
                        key=config["to"],
                        value=get_value(context.workspace, config["from"]),
                    )
                ]
            ),
            [],
            [],
        )


class BitTypeRegistry:
    """Maps installed type IDs to manifests and handlers.

    Attributes:
        _items: Manifest and handler pairs keyed by bit type id.
    """

    _items: dict[str, tuple[BitTypeManifest, BitHandler]]

    def __init__(self) -> None:
        """Initialize an empty registry."""
        self._items = {}

    def register(
        self,
        manifest: BitTypeManifest,
        handler: BitHandler,
    ) -> None:
        """Register one manifest and its handler.

        Args:
            manifest: Bit type capability and config schema manifest.
            handler: Deterministic handler implementing the bit.
        """
        self._items[manifest.type_id] = (manifest, handler)

    def get(self, type_id: str) -> tuple[BitTypeManifest, BitHandler]:
        """Resolve an installed bit type.

        Args:
            type_id: Stable bit type identifier to look up.

        Returns:
            Tuple of manifest and handler for ``type_id``.

        Raises:
            KeyError: When ``type_id`` is not registered.
        """
        return self._items[type_id]


def _manifest(filename: str) -> BitTypeManifest:
    """Load a bundled canonical manifest.

    Args:
        filename: Manifest filename under ``bits/manifests/``.

    Returns:
        Validated bit type manifest.
    """
    path = Path(__file__).parent / "manifests" / filename
    return BitTypeManifest.model_validate(json.loads(path.read_text()))


def builtin_registry() -> BitTypeRegistry:
    """Return the registry containing built-in and test helper bit types.

    Returns:
        Registry populated with Phase 1 built-ins and test helpers.
    """
    registry = BitTypeRegistry()
    registry.register(_manifest("noop.json"), NoopHandler())
    registry.register(_manifest("set_variable.json"), SetVariableHandler())
    registry.register(_manifest("copy_variable.json"), CopyVariableHandler())
    registry.register(
        _manifest("replace_named_value.json"), ReplaceNamedValueHandler()
    )
    registry.register(_manifest("append_text.json"), AppendTextHandler())
    registry.register(_manifest("sheet_set_cells.json"), SheetSetCellsHandler())
    registry.register(
        _manifest("flow_append_paragraph.json"),
        FlowAppendParagraphHandler(),
    )
    registry.register(
        _manifest("drawing_insert_polyline.json"),
        DrawingInsertPolylineHandler(),
    )
    registry.register(
        _manifest("raster_draw_text.json"), RasterDrawTextHandler()
    )

    # Test-only helper used by Phase 2 retry conformance fixtures.
    registry.register(_manifest("fake_network.json"), FakeNetworkHandler())
    return registry


def load_noop_bit_type() -> tuple[BitTypeManifest, BitHandler]:
    """Entry-point factory for ``roborean.noop``.

    Returns:
        Manifest and handler for the noop bit type.
    """
    return _manifest("noop.json"), NoopHandler()


def load_set_variable_bit_type() -> tuple[BitTypeManifest, BitHandler]:
    """Entry-point factory for ``roborean.set_variable``.

    Returns:
        Manifest and handler for the set-variable bit type.
    """
    return _manifest("set_variable.json"), SetVariableHandler()


def load_copy_variable_bit_type() -> tuple[BitTypeManifest, BitHandler]:
    """Entry-point factory for ``roborean.copy_variable``.

    Returns:
        Manifest and handler for the copy-variable bit type.
    """
    return _manifest("copy_variable.json"), CopyVariableHandler()
