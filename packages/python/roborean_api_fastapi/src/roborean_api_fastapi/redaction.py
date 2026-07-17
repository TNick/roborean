"""Redact workspace values for client responses."""

from typing import Any

from roborean_spec import (
    Exposure,
    Project,
    PublicLiteral,
    Redacted,
    RunResults,
    SecretRefValue,
    Variable,
    WorkspaceValue,
)


def redact_workspace_value(
    value: WorkspaceValue,
    *,
    exposure: Exposure | None = None,
) -> WorkspaceValue:
    """Replace secret-bearing values according to exposure."""
    if exposure in (Exposure.BACKEND_ONLY, Exposure.REDACTED_TO_CLIENT):
        return Redacted(kind="redacted", reason="secret")
    if isinstance(value, SecretRefValue):
        return Redacted(kind="redacted", reason="secret")
    if isinstance(value, PublicLiteral):
        return value
    return Redacted(kind="redacted", reason="policy")


def redact_project_for_client(project: Project) -> dict[str, Any]:
    """Return a JSON-serializable project safe for browsers."""
    if isinstance(project, dict):
        project = Project.model_validate(project)
    data = project.model_dump(mode="json", by_alias=True)
    variables = []
    for variable in project.workspace.get("variables", []):
        if isinstance(variable, dict):
            variable = Variable.model_validate(variable)
        item = variable.model_dump(mode="json", by_alias=True)
        item["defaultValue"] = redact_workspace_value(
            variable.default_value,
            exposure=variable.exposure,
        ).model_dump(mode="json", by_alias=True)
        variables.append(item)
    data["workspace"]["variables"] = variables
    return data


def _redact_patch_ops(payload: dict[str, Any]) -> dict[str, Any]:
    """Redact workspace patch operations in run results."""
    bit_results = []
    for item in payload.get("bitResults", []):
        patch = item.get("workspacePatch") or {}
        ops = []
        for op in patch.get("ops", []):
            if op.get("op") == "set" and "value" in op:
                value = op["value"]
                if (
                    isinstance(value, dict)
                    and value.get("kind") == "secret_ref"
                ):
                    op = {
                        **op,
                        "value": {"kind": "redacted", "reason": "secret"},
                    }
            ops.append(op)
        item = {**item, "workspacePatch": {**patch, "ops": ops}}
        bit_results.append(item)
    payload["bitResults"] = bit_results
    return payload


def redact_run_results_for_client(results: RunResults) -> dict[str, Any]:
    """Return run results without resolved secret literals."""
    payload = results.model_dump(mode="json", by_alias=True)
    return _redact_patch_ops(payload)


def assert_no_backend_only_literals(payload: dict[str, Any]) -> None:
    """Fail tests when raw secret literals leak to clients."""
    stack = [payload]
    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            kind = current.get("kind")
            if kind == "public_literal" and current.get("value") not in (
                None,
                "",
            ):
                exposure = current.get("exposure")
                if exposure == "backendOnly":
                    raise AssertionError("backendOnly literal leaked")
            stack.extend(current.values())
        elif isinstance(current, list):
            stack.extend(current)
