"""Discover installed document drivers."""

import logging
import os
from importlib.metadata import entry_points
from typing import Any

from roborean_spec import DocumentDriverManifest

logger = logging.getLogger(__name__)

DOCUMENT_DRIVERS_GROUP = "roborean.document_drivers"


class DriverRegistry:
    """Maps driver ids to driver instances or factories.

    Attributes:
        _drivers: Driver instances keyed by ``driver_id``.
    """

    _drivers: dict[str, Any]

    def __init__(self) -> None:
        """Create an empty registry."""
        self._drivers = {}

    def register(self, driver: Any) -> None:
        """Register a driver instance exposing ``driver_id``.

        Args:
            driver: Driver instance with ``driver_id`` and ``manifest``.
        """
        self._drivers[driver.driver_id] = driver

    def get(self, driver_id: str) -> Any:
        """Return a registered driver.

        Args:
            driver_id: Stable driver identifier to look up.

        Returns:
            Previously registered driver instance.

        Raises:
            KeyError: When ``driver_id`` is not registered.
        """
        return self._drivers[driver_id]

    def list_ids(self) -> list[str]:
        """Return registered driver ids.

        Returns:
            Sorted list of registered driver identifiers.
        """
        return sorted(self._drivers)

    def manifests(self) -> dict[str, DocumentDriverManifest]:
        """Return driver manifests keyed by id.

        Returns:
            Mapping of driver id to capability manifest.
        """
        return {
            driver_id: driver.manifest
            for driver_id, driver in self._drivers.items()
        }


def load_entry_point_drivers(
    registry: DriverRegistry | None = None,
) -> DriverRegistry:
    """Load ``roborean.document_drivers`` entry points into a registry.

    Args:
        registry: Existing registry to fill; creates a new one when omitted.

    Returns:
        Registry populated with trusted installed drivers.
    """
    registry = registry or DriverRegistry()
    selected = entry_points().select(group=DOCUMENT_DRIVERS_GROUP)

    # Third-party drivers require an explicit environment opt-in.
    allow_third = os.environ.get("ROBOREAN_ALLOW_THIRD_PARTY_PLUGINS", "") in {
        "1",
        "true",
        "TRUE",
    }

    for item in selected:
        try:
            factory = item.load()
            driver = factory() if callable(factory) else factory

            # Built-in packages are always trusted; third-party optional.
            trust = getattr(driver, "trust_tier", "core")
            if trust == "third_party" and not allow_third:
                logger.debug("Skipping third-party driver %s", item.name)
                continue

            registry.register(driver)
        except Exception:
            logger.debug(
                "Failed loading document driver %s",
                item.name,
                exc_info=True,
            )

    return registry
