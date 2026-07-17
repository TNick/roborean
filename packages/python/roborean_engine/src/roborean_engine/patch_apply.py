"""Copy-on-write application of auditable workspace patches."""

from datetime import UTC, datetime

from roborean_spec import RejectOp, WorkspacePatch

from .workspace import WorkspaceSnapshot


def apply_patch(
    snapshot: WorkspaceSnapshot,
    patch: WorkspacePatch,
    *,
    allowed_writes: set[str],
    const_keys: set[str],
    bit_id: str,
) -> tuple[WorkspaceSnapshot, WorkspacePatch]:
    """Apply permitted operations and record rejected operations."""
    # Start with detached dictionaries to preserve input snapshot identity.
    values = dict(snapshot.values)
    provenance = dict(snapshot.provenance)
    audited_ops = []

    # Apply each operation independently, preserving successful prior updates.
    for operation in patch.ops:
        if operation.op == "reject":
            audited_ops.append(operation)
            continue
        if operation.key not in allowed_writes:
            audited_ops.append(
                RejectOp(
                    op="reject",
                    key=operation.key,
                    reason="undeclared write",
                )
            )
            continue
        if operation.key in const_keys:
            audited_ops.append(
                RejectOp(
                    op="reject",
                    key=operation.key,
                    reason="const variable",
                )
            )
            continue
        if operation.op == "set":
            values[operation.key] = operation.value
        else:
            values.pop(operation.key, None)
        provenance[operation.key] = {
            "lastModifiedByBit": bit_id,
            "at": datetime.now(UTC).isoformat(),
        }
        audited_ops.append(operation)

    return (
        WorkspaceSnapshot(values=values, provenance=provenance),
        WorkspacePatch(ops=audited_ops),
    )
