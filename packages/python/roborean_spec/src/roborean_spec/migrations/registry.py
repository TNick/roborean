"""Registry for explicit Roborean project format migrations."""

from copy import deepcopy
from typing import Any


def migrate_project(
    data: dict[str, Any],
    target: str = "1.0.0",
) -> dict[str, Any]:
    """Migrate a project dictionary to a supported target version."""
    # Phase 1 has one format and still returns a detached value for callers.
    source = data.get("schemaVersion")
    if source == "1.0.0" and target == "1.0.0":
        return deepcopy(data)

    raise ValueError(
        f"Unsupported project migration from {source!r} to {target!r}"
    )
