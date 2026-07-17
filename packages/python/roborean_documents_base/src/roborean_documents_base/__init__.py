"""Document driver protocols and session manager for Roborean."""

from .artifact import hash_bytes, write_artifact
from .capabilities import CapabilitySet, assert_op_allowed
from .errors import DriverError, TemplateError, UnsupportedOperationError
from .registry import DriverRegistry, load_entry_point_drivers
from .session import DocumentSessionManager
from .template_store import DocumentTemplateStore

__version__ = "0.3.0"

__all__ = [
    "CapabilitySet",
    "DocumentSessionManager",
    "DocumentTemplateStore",
    "DriverError",
    "DriverRegistry",
    "TemplateError",
    "UnsupportedOperationError",
    "assert_op_allowed",
    "hash_bytes",
    "load_entry_point_drivers",
    "write_artifact",
]
