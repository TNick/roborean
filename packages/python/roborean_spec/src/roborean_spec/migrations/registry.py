"""Registry for explicit Roborean project format migrations."""

from copy import deepcopy
from typing import Any


def migrate_project(
    data: dict[str, Any],
    target: str = "1.1.0",
) -> dict[str, Any]:
    """Migrate a project dictionary to a supported target version.

    Args:
        data: Raw project JSON object with a ``schemaVersion`` field.
        target: Desired schema version (default ``1.1.0``).

    Returns:
        Deep-copied project dictionary at ``target`` schema version.

    Raises:
        ValueError: When the source/target pair is unsupported.
    """
    result = deepcopy(data)
    source = result.get("schemaVersion")

    if source == target:
        return result

    if source == "1.0.0" and target == "1.1.0":
        # Document fields are additive; bump the version marker only.
        result["schemaVersion"] = "1.1.0"
        return result

    if source == "1.0.0" and target == "1.0.0":
        return result

    raise ValueError(
        f"Unsupported project migration from {source!r} to {target!r}"
    )
