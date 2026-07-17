"""Build redacted run diffs from workspace snapshots and results."""

from roborean_spec import (
    RunDiff,
    RunResults,
    SecretRefAccess,
    SecretRefValue,
    WorkspaceChange,
    WorkspaceValue,
)

from .workspace import WorkspaceSnapshot


def redact_workspace_value_for_diff(value: WorkspaceValue) -> WorkspaceValue:
    """Return a value safe to persist in diffs (refs stay refs)."""
    return value


def _parse_secret_ref(ref: str) -> tuple[str, str]:
    """Split ``sec:provider:name`` into provider and name."""
    parts = ref.split(":")
    if len(parts) >= 3 and parts[0] == "sec":
        return parts[1], ":".join(parts[2:])
    return "unknown", ref


def build_run_diff(
    input_workspace: WorkspaceSnapshot,
    final_workspace: WorkspaceSnapshot,
    results: RunResults,
) -> RunDiff:
    """Compare snapshots and summarize bit outcomes without secret values."""
    keys = sorted(set(input_workspace.values) | set(final_workspace.values))
    changes: list[WorkspaceChange] = []
    for key in keys:
        before = input_workspace.values.get(key)
        after = final_workspace.values.get(key)
        before_dump = (
            None
            if before is None
            else before.model_dump(mode="json", by_alias=True)
        )
        after_dump = (
            None
            if after is None
            else after.model_dump(mode="json", by_alias=True)
        )
        if before_dump != after_dump:
            changes.append(
                WorkspaceChange(
                    key=key,
                    before=(
                        None
                        if before is None
                        else redact_workspace_value_for_diff(before)
                    ),
                    after=(
                        None
                        if after is None
                        else redact_workspace_value_for_diff(after)
                    ),
                )
            )

    activated: list[str] = []
    inactive: list[str] = []
    failed: list[str] = []
    secret_access: list[SecretRefAccess] = []
    doc_counts: dict[str, int] = {}

    for bit in results.bit_results:
        if bit.status == "inactive":
            inactive.append(bit.bit_id)
        elif bit.active:
            activated.append(bit.bit_id)
        if bit.status == "failed":
            failed.append(bit.bit_id)
        doc_counts[bit.bit_id] = len(bit.document_ops)
        for operation in bit.workspace_patch.ops:
            if operation.op != "set":
                continue
            value = operation.value
            if isinstance(value, SecretRefValue):
                provider, name = _parse_secret_ref(value.ref)
                secret_access.append(
                    SecretRefAccess(
                        bitId=bit.bit_id,
                        provider=provider,
                        name=name,
                    )
                )

    # Also note secret refs present in the final workspace.
    for key, value in final_workspace.values.items():
        if isinstance(value, SecretRefValue):
            provider, name = _parse_secret_ref(value.ref)
            secret_access.append(
                SecretRefAccess(
                    bitId="workspace",
                    provider=provider,
                    name=name,
                )
            )

    return RunDiff(
        workspaceChanges=changes,
        bitsActivated=activated,
        bitsSkippedInactive=inactive,
        bitsFailed=failed,
        secretRefsAccessed=secret_access,
        documentOpsCount=doc_counts,
    )
