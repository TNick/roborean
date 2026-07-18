"""Stable diagnostics emitted by the Roborean compiler and runner."""

from dataclasses import asdict, dataclass
from typing import Literal

E_SCHEMA = "E_SCHEMA"
E_UNKNOWN_BIT_TYPE = "E_UNKNOWN_BIT_TYPE"
E_RULE_TYPE = "E_RULE_TYPE"
E_RULE_EVAL = "E_RULE_EVAL"
E_UNDECLARED_WRITE = "E_UNDECLARED_WRITE"
E_CONST_WRITE = "E_CONST_WRITE"
E_CONFIG = "E_CONFIG"
E_LOCKFILE_MISMATCH = "E_LOCKFILE_MISMATCH"
E_CAPABILITY_MISSING = "E_CAPABILITY_MISSING"
E_BIT_EMISSION_UNDOCUMENTED = "E_BIT_EMISSION_UNDOCUMENTED"
W_UNUSED_VARIABLE = "W_UNUSED_VARIABLE"
W_DEAD_BIT = "W_DEAD_BIT"


@dataclass(frozen=True)
class Diagnostic:
    """A portable compiler or runtime diagnostic.

    Attributes:
        severity: Diagnostic level (``error``, ``warning``, or ``info``).
        code: Stable machine-readable diagnostic code.
        message: Human-readable diagnostic text.
        path: Optional JSON-pointer-like location within the project.
    """

    severity: Literal["error", "warning", "info"]
    code: str
    message: str
    path: str | None = None

    def to_dict(self) -> dict[str, str | None]:
        """Return a JSON-compatible diagnostic.

        Returns:
            Mapping of diagnostic fields suitable for JSON serialization.
        """
        return asdict(self)
