"""Static checks for rule variable references."""

from collections.abc import Mapping

from roborean_spec import RuleAst, SecretRefValue, Variable


class RuleTypeError(ValueError):
    """Raised when a rule cannot safely read a declared variable."""


def typecheck_rule(
    rule: RuleAst,
    variables: Mapping[str, Variable],
) -> None:
    """Reject missing and secret references in an activation expression."""
    # Validate direct variable references before descending into nested ASTs.
    if rule.op == "var":
        key = rule.args[0]
        if not isinstance(key, str) or key not in variables:
            raise RuleTypeError(f"Unknown variable in rule: {key!r}")
        if isinstance(variables[key].default_value, SecretRefValue):
            raise RuleTypeError(
                f"Secret variable cannot appear in rule: {key}"
            )

    # Traverse every nested rule argument.
    for argument in rule.args:
        if isinstance(argument, dict) and "op" in argument:
            typecheck_rule(RuleAst.model_validate(argument), variables)
