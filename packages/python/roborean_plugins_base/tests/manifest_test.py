"""Tests for plugin manifests."""

from roborean_plugins_base import PluginManifest, TrustTier
from roborean_spec import EffectClass


class TestPluginManifest:
    """Manifest construction."""

    def test_frozen_fields(self) -> None:
        """Manifests expose core metadata."""
        manifest = PluginManifest(
            id="roborean.noop",
            version="1.0.0",
            kind="bit-type",
            capabilities=frozenset(),
            trust_tier=TrustTier.CORE,
            effect_class=EffectClass.PURE,
        )
        assert manifest.id == "roborean.noop"
        assert manifest.trust_tier is TrustTier.CORE
