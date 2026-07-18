"""Project package lockfile loading and compile-time enforcement."""

import json
import logging
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, ValidationError
from roborean_spec import Project
from roborean_spec.schema_loader import load_schema

from .diagnostics import E_LOCKFILE_MISMATCH, Diagnostic

logger = logging.getLogger(__name__)

LOCK_FILENAME = "project.lock"


def load_lockfile(package_dir: Path) -> dict[str, Any] | None:
    """Load ``project.lock`` when present in a package directory.

    Args:
        package_dir: On-disk project package root.

    Returns:
        Parsed lockfile object, or ``None`` when no lockfile exists.
    """
    path = package_dir / LOCK_FILENAME
    if not path.is_file():
        return None

    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        msg = f"{LOCK_FILENAME} must be a JSON object"
        raise ValueError(msg)

    schema = load_schema("project-lock")
    Draft202012Validator(schema).validate(data)

    return data


def validate_lockfile(
    project: Project,
    *,
    package_dir: Path | None,
    resolved_bit_versions: dict[str, str],
) -> list[Diagnostic]:
    """Compare resolved plugin versions against an optional package lockfile.

    Args:
        project: Project being compiled.
        package_dir: Optional package directory containing ``project.lock``.
        resolved_bit_versions: Bit type id to resolved manifest version.

    Returns:
        Diagnostics when the lockfile disagrees with resolved versions.
    """
    if package_dir is None:
        return []

    try:
        lock = load_lockfile(package_dir)
    except (ValidationError, ValueError, json.JSONDecodeError) as error:
        logger.debug("Invalid project lockfile", exc_info=True)
        return [
            Diagnostic(
                "error",
                E_LOCKFILE_MISMATCH,
                f"Invalid {LOCK_FILENAME}: {error}",
                f"/{LOCK_FILENAME}",
            )
        ]

    if lock is None:
        return []

    diagnostics: list[Diagnostic] = []
    locked_bits = lock.get("bitTypes", {})
    if not isinstance(locked_bits, dict):
        return [
            Diagnostic(
                "error",
                E_LOCKFILE_MISMATCH,
                "Lockfile bitTypes must be an object",
                f"/{LOCK_FILENAME}/bitTypes",
            )
        ]

    used_types = {bit.type for bit in project.bits}
    for type_id in sorted(used_types):
        if type_id not in locked_bits:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_LOCKFILE_MISMATCH,
                    f"Lockfile missing bit type pin: {type_id}",
                    f"/{LOCK_FILENAME}/bitTypes/{type_id}",
                )
            )
            continue
        expected = str(locked_bits[type_id])
        actual = resolved_bit_versions.get(type_id)
        if actual is None:
            continue
        if actual != expected:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_LOCKFILE_MISMATCH,
                    (
                        f"Lockfile pins {type_id} at {expected}, "
                        f"host resolved {actual}"
                    ),
                    f"/{LOCK_FILENAME}/bitTypes/{type_id}",
                )
            )

    locked_drivers = lock.get("documentDrivers")
    if locked_drivers is None:
        return diagnostics

    if not isinstance(locked_drivers, dict):
        diagnostics.append(
            Diagnostic(
                "error",
                E_LOCKFILE_MISMATCH,
                "Lockfile documentDrivers must be an object",
                f"/{LOCK_FILENAME}/documentDrivers",
            )
        )
        return diagnostics

    for document in project.documents:
        driver_id = document.driver
        if driver_id not in locked_drivers:
            diagnostics.append(
                Diagnostic(
                    "error",
                    E_LOCKFILE_MISMATCH,
                    f"Lockfile missing document driver pin: {driver_id}",
                    f"/{LOCK_FILENAME}/documentDrivers/{driver_id}",
                )
            )

    return diagnostics
