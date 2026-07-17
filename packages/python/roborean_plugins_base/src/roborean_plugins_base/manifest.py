"""Installed plugin manifest types."""

from dataclasses import dataclass
from enum import Enum
from typing import Literal

from roborean_spec import EffectClass


class TrustTier(str, Enum):
    """Trust classification for installed plugins.

    Attributes:
        CORE: First-party core plugins always allowed.
        INTERNAL: Internal organization plugins.
        THIRD_PARTY: External plugins requiring explicit opt-in.
        DEV: Local development plugins.
    """

    CORE = "core"
    INTERNAL = "internal"
    THIRD_PARTY = "third_party"
    DEV = "dev"


@dataclass(frozen=True)
class PluginManifest:
    """Describes one installed plugin package contribution.

    Attributes:
        id: Stable plugin contribution identifier.
        version: Plugin package or contribution version.
        kind: Contribution kind (``bit-type`` or ``document-driver``).
        capabilities: Advertised capability identifiers.
        trust_tier: Trust classification controlling discovery policy.
        effect_class: Optional effect class for bit-type contributions.
    """

    id: str
    version: str
    kind: Literal["bit-type", "document-driver"]
    capabilities: frozenset[str]
    trust_tier: TrustTier
    effect_class: EffectClass | None = None
