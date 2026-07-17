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
    """Replace secret-bearing values according to exposure.

    Args:
        value: Workspace value that may contain secrets.
        exposure: Declared variable exposure, when known.

    Returns:
        Value safe to return to a browser client.
    """
    # Backend-only and redacted exposures never leave the server as literals.
    if exposure in (Exposure.BACKEND_ONLY, Exposure.REDACTED_TO_CLIENT):
        return Redacted(kind="redacted", reason="secret")

    # Secret refs are always masked in client responses.
    if isinstance(value, SecretRefValue):
        return Redacted(kind="redacted", reason="secret")

    if isinstance(value, PublicLiteral):
        return value

    return Redacted(kind="redacted", reason="policy")


def redact_project_for_client(project: Project) -> dict[str, Any]:
    """Return a JSON-serializable project safe for browsers.

    Args:
        project: Project model or dict accepted by the Project validator.

    Returns:
        Project payload with redacted variable defaults.
    """
    if isinstance(project, dict):
        project = Project.model_validate(project)

    # Omit null optional fields so Draft 2020-12 schemas stay valid.
    data = project.model_dump(mode="json", by_alias=True, exclude_none=True)

    # Redact each variable default according to its exposure.
    variables = []
    for variable in project.workspace.get("variables", []):
        if isinstance(variable, dict):
            variable = Variable.model_validate(variable)
        item = variable.model_dump(
            mode="json", by_alias=True, exclude_none=True
        )
        item["defaultValue"] = redact_workspace_value(
            variable.default_value,
            exposure=variable.exposure,
        ).model_dump(mode="json", by_alias=True, exclude_none=True)
        variables.append(item)
    data["workspace"]["variables"] = variables
    return data


def _redact_patch_ops(payload: dict[str, Any]) -> dict[str, Any]:
    """Redact workspace patch operations in run results.

    Args:
        payload: Serialized run-results dictionary (camelCase keys).

    Returns:
        Payload with secret_ref patch values replaced by redacted stubs.
    """
    bit_results = []
    for item in payload.get("bitResults", []):
        patch = item.get("workspacePatch") or {}
        ops = []

        # Mask secret_ref values embedded in set operations.
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
    """Return run results without resolved secret literals.

    Args:
        results: Durable run results model.

    Returns:
        JSON-serializable results with redacted patch ops.
    """
    payload = results.model_dump(mode="json", by_alias=True, exclude_none=True)
    return _redact_patch_ops(payload)


def assert_no_backend_only_literals(payload: dict[str, Any]) -> None:
    """Fail tests when raw secret literals leak to clients.

    Args:
        payload: Nested JSON-like structure from an API response.

    Raises:
        AssertionError: When a ``backendOnly`` public literal is found.
    """
    stack = [payload]
    while stack:
        current = stack.pop()

        # Walk dict trees looking for leaked backend-only literals.
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
