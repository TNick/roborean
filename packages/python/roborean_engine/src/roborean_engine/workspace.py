"""Immutable-style in-memory workspace snapshots."""

import hashlib
import json
from dataclasses import dataclass, field

from roborean_spec import Project, WorkspaceValue


@dataclass(frozen=True)
class WorkspaceSnapshot:
    """Runtime workspace values and their modification provenance.

    Attributes:
        values: Workspace values keyed by variable key.
        provenance: Per-key modification metadata (bit id and timestamp).
    """

    values: dict[str, WorkspaceValue]
    provenance: dict[str, dict[str, str]] = field(default_factory=dict)


def initial_snapshot(project: Project) -> WorkspaceSnapshot:
    """Build the initial snapshot from project variable defaults.

    Args:
        project: Project whose variables supply default values.

    Returns:
        Snapshot containing each variable's default value.
    """
    # Copy model values so a caller cannot mutate project-owned containers.
    values = {
        variable.key: variable.default_value for variable in project.variables
    }
    return WorkspaceSnapshot(values=values)


def get_value(snapshot: WorkspaceSnapshot, key: str) -> WorkspaceValue:
    """Get a workspace value or raise KeyError when it is absent.

    Args:
        snapshot: Workspace snapshot to read.
        key: Variable key to look up.

    Returns:
        Workspace value stored under ``key``.

    Raises:
        KeyError: When ``key`` is not present in the snapshot.
    """
    return snapshot.values[key]


def workspace_hash(snapshot: WorkspaceSnapshot) -> str:
    """Hash workspace values using the shared canonical JSON algorithm.

    Args:
        snapshot: Workspace snapshot whose values are hashed.

    Returns:
        Hex-encoded SHA-256 digest of canonical JSON values.
    """
    # Only values contribute; provenance and time must not change semantics.
    data = {
        key: value.model_dump(mode="json", by_alias=True, exclude_none=True)
        for key, value in snapshot.values.items()
    }
    payload = json.dumps(
        data,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
