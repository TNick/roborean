"""Document driver and session protocols."""

from typing import Any, Mapping, Protocol

from roborean_spec import (
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    TemplateManifest,
)

from .template_store import DocumentTemplateStore


class DocumentSession(Protocol):
    """Mutable per-document generation state."""

    document_id: str
    driver_id: str
    ops_applied: list[dict[str, Any]]


class DocumentDriver(Protocol):
    """Format-specific document engine.

    Attributes:
        driver_id: Stable id such as ``roborean.docx``.
        manifest: Driver capability manifest.
    """

    driver_id: str
    manifest: DocumentDriverManifest

    def load_template(
        self,
        template_ref: str,
        *,
        store: DocumentTemplateStore,
        manifest: TemplateManifest,
    ) -> None:
        """Load mandatory template bytes into driver-internal state."""

    def begin_session(
        self,
        workspace: Any,
        metadata: Mapping[str, Any],
    ) -> DocumentSession:
        """Open a session bound to current workspace snapshot."""

    def apply_operation(
        self,
        session: DocumentSession,
        op: DocumentOperation,
    ) -> None:
        """Apply one typed operation."""

    def finalize(self, session: DocumentSession) -> None:
        """Seal the session before serialization."""

    def serialize(self, session: DocumentSession) -> bytes:
        """Return artifact bytes."""

    def preview(self, session: DocumentSession) -> DocumentPreview | None:
        """Optional backend preview."""
