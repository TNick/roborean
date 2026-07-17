"""Parser for canonical JSON rule ASTs."""

from typing import Any

from pydantic import ValidationError
from roborean_spec import RuleAst

from .profile import ALLOWED_OPS


def parse_rule(data: Any) -> RuleAst:
    """Parse data into a recursively validated rule AST.

    Args:
        data: Raw JSON-compatible rule AST object.

    Returns:
        Validated ``RuleAst`` whose operator is in the Phase 1 profile.

    Raises:
        ValueError: When the AST is invalid or uses an unsupported operator.
    """
    # Structural errors come from Pydantic; this enforces the rule profile.
    try:
        rule = RuleAst.model_validate(data)
    except ValidationError as error:
        raise ValueError(f"Invalid rule AST: {error}") from error

    if rule.op not in ALLOWED_OPS:
        raise ValueError(f"Unsupported rule operator: {rule.op}")

    return rule
