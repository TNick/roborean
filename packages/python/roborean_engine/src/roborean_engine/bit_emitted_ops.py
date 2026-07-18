"""Static document operation kinds emitted by built-in bit types."""

from dataclasses import dataclass
from typing import Literal

from roborean_documents_base import DriverRegistry
from roborean_spec import Bit, Project

from .bits.registry import BitTypeRegistry
from .diagnostics import (
    E_BIT_EMISSION_UNDOCUMENTED,
    E_CAPABILITY_MISSING,
    Diagnostic,
)


@dataclass(frozen=True)
class BitEmissionSpec:
    """How a bit type declares document operations at compile time.

    Attributes:
        mode: ``fixed`` uses ``fixed_ops``; ``config_dynamic`` reads project
            config (``ops`` arrays or ``op`` overrides).
        fixed_ops: Operation kinds this type may emit when ``mode`` is fixed.
    """

    mode: Literal["fixed", "config_dynamic"]
    fixed_ops: frozenset[str] = frozenset()


DOCUMENT_BIT_EMISSION_SPEC: dict[str, BitEmissionSpec] = {
    "roborean.replace_named_value": BitEmissionSpec(
        "fixed",
        frozenset({"replace_named_value"}),
    ),
    "roborean.append_text": BitEmissionSpec(
        "fixed",
        frozenset({"plain.append_text", "flow.insert_paragraph"}),
    ),
    "roborean.sheet_set_cells": BitEmissionSpec(
        "fixed",
        frozenset({"sheet.set_cell", "sheet.set_formula"}),
    ),
    "roborean.flow_append_paragraph": BitEmissionSpec("config_dynamic"),
    "roborean.drawing_insert_polyline": BitEmissionSpec("config_dynamic"),
    "roborean.raster_draw_text": BitEmissionSpec("config_dynamic"),
}


def emitted_ops_for_bit(bit: Bit) -> set[str]:
    """Resolve document operation kinds one bit instance may emit.

    Args:
        bit: Bit definition from the project.

    Returns:
        Operation names (``DocumentOperation.op``) for capability checks.
    """
    spec = DOCUMENT_BIT_EMISSION_SPEC.get(bit.type)
    if spec is None:
        return set()

    if spec.mode == "config_dynamic":
        return _ops_from_config_ops_array(bit.config)

    if bit.type == "roborean.append_text":
        op_name = str(bit.config.get("op", "plain.append_text"))
        if op_name == "flow.insert_paragraph":
            return {"flow.insert_paragraph"}
        return {"plain.append_text"}

    if bit.type == "roborean.sheet_set_cells":
        ops: set[str] = set()
        cells = bit.config.get("cells")
        formulas = bit.config.get("formulas")
        if isinstance(cells, list) and cells:
            ops.add("sheet.set_cell")
        if isinstance(formulas, list) and formulas:
            ops.add("sheet.set_formula")
        if not ops:
            return set(spec.fixed_ops)
        return ops

    return set(spec.fixed_ops)


def collect_emitted_ops_from_bit_types(project: Project) -> set[str]:
    """Union document op kinds emitted by all bits in a project.

    Args:
        project: Project whose bit configs are scanned.

    Returns:
        All operation kinds that may be emitted during a run.
    """
    emitted: set[str] = set()
    for bit in project.bits:
        emitted.update(emitted_ops_for_bit(bit))
    return emitted


def validate_registered_document_bit_types(
    bit_registry: BitTypeRegistry,
    driver_registry: DriverRegistry,
) -> list[Diagnostic]:
    """Audit installed document bit types against driver capabilities.

    Args:
        bit_registry: Installed bit type manifests (for example built-ins).
        driver_registry: Installed document drivers.

    Returns:
        Errors when a document bit type lacks an emission spec or fixed ops
        are not supported by any installed driver.
    """
    driver_caps: set[str] = set()
    for driver_id in driver_registry.list_ids():
        driver = driver_registry.get(driver_id)
        driver_caps.update(driver.manifest.capabilities)

    diagnostics: list[Diagnostic] = []
    for type_id, manifest in bit_registry.iter_types():
        if manifest.effect_class != "document":
            continue

        spec = DOCUMENT_BIT_EMISSION_SPEC.get(type_id)
        if spec is None:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_BIT_EMISSION_UNDOCUMENTED,
                    f"Document bit type {type_id} has no emission spec",
                    f"/bitTypes/{type_id}",
                )
            )
            continue

        if spec.mode != "fixed":
            continue

        for op_kind in spec.fixed_ops:
            if op_kind not in driver_caps:
                diagnostics.append(
                    Diagnostic(
                        "error",
                        E_CAPABILITY_MISSING,
                        (
                            f"No installed driver supports op {op_kind} "
                            f"required by bit type {type_id}"
                        ),
                        f"/bitTypes/{type_id}",
                    )
                )

    return diagnostics


def _ops_from_config_ops_array(config: dict) -> set[str]:
    """Collect ``op`` fields from a bit config ``ops`` list.

    Args:
        config: Bit configuration mapping.

    Returns:
        Operation kind strings declared in config.
    """
    ops: set[str] = set()
    raw_ops = config.get("ops")
    if not isinstance(raw_ops, list):
        return ops
    for item in raw_ops:
        if isinstance(item, dict):
            op_name = item.get("op")
            if isinstance(op_name, str) and op_name:
                ops.add(op_name)
    return ops
