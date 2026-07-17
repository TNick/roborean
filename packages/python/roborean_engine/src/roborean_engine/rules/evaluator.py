"""Deterministic evaluator for the Phase 1 rule profile."""

from typing import Any

from roborean_spec import PublicLiteral, RuleAst

from ..workspace import WorkspaceSnapshot


class RuleEvalError(ValueError):
    """Raised when strict rule evaluation cannot produce a value."""


def _value(rule: RuleAst, workspace: WorkspaceSnapshot, strict: bool) -> Any:
    """Evaluate one rule node to a primitive value.

    Args:
        rule: Rule AST node to evaluate.
        workspace: Workspace snapshot providing variable values.
        strict: When true, missing variables raise instead of yielding None.

    Returns:
        Primitive value or boolean result for the node.

    Raises:
        RuleEvalError: When evaluation cannot produce a safe value.
    """
    # Literal nodes carry their JSON primitive directly.
    if rule.op == "const":
        return rule.args[0]

    # Variable nodes expose only public literal payloads to comparisons.
    if rule.op == "var":
        key = rule.args[0]
        if key not in workspace.values:
            if strict:
                raise RuleEvalError(f"Missing workspace variable: {key}")
            return None
        value = workspace.values[key]
        if not isinstance(value, PublicLiteral):
            raise RuleEvalError(f"Non-literal workspace value in rule: {key}")
        return value.value

    # Presence accepts either a key or a var node.
    if rule.op == "has":
        argument = rule.args[0]
        key = argument if isinstance(argument, str) else argument["args"][0]
        return key in workspace.values

    # Boolean operators preserve short-circuit semantics.
    if rule.op == "and":
        return all(
            bool(_value(RuleAst.model_validate(item), workspace, strict))
            for item in rule.args
        )
    if rule.op == "or":
        return any(
            bool(_value(RuleAst.model_validate(item), workspace, strict))
            for item in rule.args
        )
    if rule.op == "not":
        return not bool(
            _value(RuleAst.model_validate(rule.args[0]), workspace, strict)
        )

    # Comparison operators operate on the two recursively resolved operands.
    left = _value(RuleAst.model_validate(rule.args[0]), workspace, strict)
    right = _value(RuleAst.model_validate(rule.args[1]), workspace, strict)
    comparisons = {
        "eq": lambda: left == right,
        "ne": lambda: left != right,
        "lt": lambda: left < right,
        "le": lambda: left <= right,
        "gt": lambda: left > right,
        "ge": lambda: left >= right,
    }
    try:
        return comparisons[rule.op]()
    except (KeyError, TypeError) as error:
        raise RuleEvalError(f"Invalid {rule.op} comparison") from error


def evaluate_rule(
    rule: RuleAst,
    workspace: WorkspaceSnapshot,
    *,
    strict: bool = True,
) -> bool:
    """Evaluate a rule expression to a boolean.

    Args:
        rule: Root rule AST to evaluate.
        workspace: Workspace snapshot providing variable values.
        strict: When true, missing variables raise ``RuleEvalError``.

    Returns:
        Boolean result of the rule expression.

    Raises:
        RuleEvalError: When evaluation cannot produce a safe value.
    """
    return bool(_value(rule, workspace, strict))
