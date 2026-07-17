"""The fixed Phase 1 Roborean rule profile."""

RULE_PROFILE_VERSION = "1.0.0"
ALLOWED_OPS = frozenset(
    {
        "and",
        "or",
        "not",
        "eq",
        "ne",
        "lt",
        "le",
        "gt",
        "ge",
        "has",
        "const",
        "var",
    }
)
