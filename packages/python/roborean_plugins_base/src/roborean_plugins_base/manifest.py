"""Installed plugin manifest types."""

from dataclasses import dataclass
from enum import Enum
from typing import Literal

from roborean_spec import EffectClass


class TrustTier(str, Enum):
    """Trust classification for installed plugins."""

    CORE = "core"
    INTERNAL = "internal"
    THIRD_PARTY = "third_party"
    DEV = "dev"


@dataclass(frozen=True)
class PluginManifest:
    """Describes one installed plugin package contribution."""

    id: str
    version: str
    kind: Literal["bit-type", "document-driver"]
    capabilities: frozenset[str]
    trust_tier: TrustTier
    effect_class: EffectClass | None = None
