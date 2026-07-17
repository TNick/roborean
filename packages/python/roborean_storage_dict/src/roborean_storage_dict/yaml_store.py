"""YAML helpers that only use safe_load."""

from pathlib import Path
from typing import Any

import yaml
from roborean_storage_base import IntegrityError


def load_yaml(path: Path) -> dict[str, Any]:
    """Load YAML using yaml.safe_load only."""
    # Reject non-mapping roots so package files stay object-shaped.
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as error:
        raise IntegrityError(f"Invalid YAML: {path}") from error
    if not isinstance(data, dict):
        raise IntegrityError(f"YAML root must be a mapping: {path}")
    return data


def dump_yaml(path: Path, data: dict[str, Any]) -> None:
    """Write a YAML mapping with a trailing newline."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(data, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
    )
