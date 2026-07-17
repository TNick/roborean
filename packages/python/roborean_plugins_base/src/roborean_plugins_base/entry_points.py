"""Discover bit types advertised through package entry points."""

import logging
import os
from importlib.metadata import entry_points
from typing import Any

from .manifest import PluginManifest, TrustTier

logger = logging.getLogger(__name__)

BIT_TYPES_GROUP = "roborean.bit_types"


def load_bit_type_entry_points(
    *,
    allow_third_party: bool | None = None,
) -> list[tuple[PluginManifest, Any]]:
    """Load bit-type factories from installed entry points.

    Each entry point should resolve to a zero-arg callable that returns
    ``(BitTypeManifest, BitHandler)`` or an object with ``manifest`` and
    ``handler`` attributes.
    """
    if allow_third_party is None:
        allow_third_party = os.environ.get(
            "ROBOREAN_ALLOW_THIRD_PARTY_PLUGINS", ""
        ) in {"1", "true", "TRUE"}

    selected = entry_points()
    group = selected.select(group=BIT_TYPES_GROUP)
    loaded: list[tuple[PluginManifest, Any]] = []

    # Load each advertised factory, skipping disallowed trust tiers.
    for item in group:
        try:
            factory = item.load()
            payload = factory() if callable(factory) else factory
            if hasattr(payload, "manifest") and hasattr(payload, "handler"):
                bit_manifest = payload.manifest
                handler = payload.handler
            else:
                bit_manifest, handler = payload
            trust = TrustTier.CORE
            if hasattr(payload, "trust_tier"):
                trust = TrustTier(payload.trust_tier)
            if trust == TrustTier.THIRD_PARTY and not allow_third_party:
                logger.debug(
                    "Skipping third-party bit type %s",
                    item.name,
                )
                continue
            plugin = PluginManifest(
                id=bit_manifest.type_id,
                version=bit_manifest.version,
                kind="bit-type",
                capabilities=frozenset(bit_manifest.capabilities),
                trust_tier=trust,
                effect_class=bit_manifest.effect_class,
            )
            loaded.append((plugin, (bit_manifest, handler)))
        except Exception:
            logger.debug(
                "Failed loading bit type entry point %s",
                item.name,
                exc_info=True,
            )
    return loaded
