"""Plugin manifests and installed-package discovery."""

from .entry_points import load_bit_type_entry_points
from .manifest import PluginManifest, TrustTier

__version__ = "0.2.0"

__all__ = [
    "PluginManifest",
    "TrustTier",
    "load_bit_type_entry_points",
]
