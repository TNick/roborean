"""Document driver and session protocols."""

from collections.abc import Mapping
from typing import Any, Protocol

from roborean_spec import (
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    TemplateManifest,
)

from .template_store import DocumentTemplateStore


class DocumentSession(Protocol):
    """Mutable per-document generation state.

    Attributes:
        document_id: Document definition identifier for this session.
        driver_id: Driver id that owns the session.
        ops_applied: Serialized operations applied so far.
    """

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
        """Load mandatory template bytes into driver-internal state.

        Args:
            template_ref: Template identifier within the project package.
            store: Template store used to resolve bytes and manifests.
            manifest: Validated template sidecar manifest.
        """

    def begin_session(
        self,
        workspace: Any,
        metadata: Mapping[str, Any],
    ) -> DocumentSession:
        """Open a session bound to current workspace snapshot.

        Args:
            workspace: Current workspace snapshot for the run.
            metadata: Session metadata such as document and project ids.

        Returns:
            Mutable session state for subsequent operations.
        """

    def apply_operation(
        self,
        session: DocumentSession,
        op: DocumentOperation,
    ) -> None:
        """Apply one typed operation.

        Args:
            session: Open session that receives the operation.
            op: Typed document operation to apply.
        """

    def finalize(self, session: DocumentSession) -> None:
        """Seal the session before serialization.

        Args:
            session: Open session to finalize.
        """

    def serialize(self, session: DocumentSession) -> bytes:
        """Return artifact bytes.

        Args:
            session: Finalized session to serialize.

        Returns:
            Binary artifact payload for storage.
        """

    def preview(self, session: DocumentSession) -> DocumentPreview | None:
        """Optional backend preview.

        Args:
            session: Finalized session to preview.

        Returns:
            Browser-safe preview payload, or None when unsupported.
        """
