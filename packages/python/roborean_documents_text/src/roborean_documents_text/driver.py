"""Plain-text document driver."""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Mapping

from pydantic import TypeAdapter
from roborean_documents_base.capabilities import assert_op_allowed
from roborean_documents_base.resolve_values import public_literal_value
from roborean_spec import (
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    TemplateManifest,
    WorkspaceValue,
)


@dataclass
class TextSession:
    """In-memory text generation session."""

    document_id: str
    driver_id: str
    body: str
    ops_applied: list[dict[str, Any]] = field(default_factory=list)
    finalized: bool = False


class TextDocumentDriver:
    """UTF-8 text driver using Mustache-like ``{{slot}}`` replacement."""

    driver_id = "roborean.text"
    manifest = DocumentDriverManifest(
        driverId="roborean.text",
        version="0.3.0",
        irFamily="plain",
        capabilities=[
            "set_metadata",
            "replace_named_value",
            "plain.append_text",
            "plain.replace_all",
            "finalize",
        ],
        supportsPreview=True,
        supportsBrowserExecution=True,
        supportsDiff=True,
        requiresBackend=False,
        templateMediaTypes=["text/plain"],
    )

    def __init__(self) -> None:
        """Initialize empty template state."""
        self._template = ""
        self._manifest: TemplateManifest | None = None

    def load_template(self, template_ref, *, store, manifest) -> None:
        """Load UTF-8 template bytes."""
        # Normalize newlines so Windows-checked-out templates stay portable.
        text = store.load_bytes(template_ref).decode("utf-8")
        self._template = text.replace("\r\n", "\n")
        self._manifest = manifest

    def begin_session(
        self, workspace, metadata: Mapping[str, Any]
    ) -> TextSession:
        """Start a session from the loaded template."""
        return TextSession(
            document_id=str(metadata.get("documentId", "")),
            driver_id=self.driver_id,
            body=self._template,
        )

    def apply_operation(
        self, session: TextSession, op: DocumentOperation
    ) -> None:
        """Apply one plain-text operation."""
        assert_op_allowed(self.manifest, op)
        data = op.model_dump(mode="python", by_alias=True)
        session.ops_applied.append(op.model_dump(mode="json", by_alias=True))
        if op.op == "replace_named_value":
            value = TypeAdapter(WorkspaceValue).validate_python(data["value"])
            session.body = session.body.replace(
                "{{" + str(data["name"]) + "}}",
                str(public_literal_value(value)),
            )
        elif op.op == "plain.append_text":
            session.body += str(data["text"])
        elif op.op == "plain.replace_all":
            session.body = session.body.replace(
                str(data["find"]), str(data["replace"])
            )

    def finalize(self, session: TextSession) -> None:
        """Mark the session finalized."""
        session.finalized = True

    def serialize(self, session: TextSession) -> bytes:
        """Return UTF-8 bytes with a trailing newline."""
        body = session.body
        if not body.endswith("\n"):
            body += "\n"
        return body.encode("utf-8")

    def preview(self, session: TextSession) -> DocumentPreview:
        """Return a text preview identical to serialization."""
        return DocumentPreview(
            documentId=session.document_id,
            mode="text",
            body=self.serialize(session).decode("utf-8"),
            warnings=[],
            generatedAt=datetime.now(UTC).isoformat(),
            renderer={
                "package": "roborean-documents-text",
                "version": "0.3.0",
            },
        )


def create_driver() -> TextDocumentDriver:
    """Entry-point factory."""
    return TextDocumentDriver()
