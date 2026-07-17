"""Parser for canonical JSON rule ASTs."""

from typing import Any

from pydantic import ValidationError
from roborean_spec import RuleAst

from .profile import ALLOWED_OPS


def parse_rule(data: Any) -> RuleAst:
    """Parse data into a recursively validated rule AST."""
    # Pydantic supplies structural errors while this check protects the profile.
    try:
        rule = RuleAst.model_validate(data)
    except ValidationError as error:
        raise ValueError(f"Invalid rule AST: {error}") from error
    if rule.op not in ALLOWED_OPS:
        raise ValueError(f"Unsupported rule operator: {rule.op}")
    return rule
