"""DOCX document driver using docxtpl and python-docx."""

import io
import logging
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from docx import Document
from docxtpl import DocxTemplate
from pydantic import TypeAdapter
from roborean_documents_base.capabilities import assert_op_allowed
from roborean_documents_base.errors import DriverError
from roborean_documents_base.resolve_values import public_literal_value
from roborean_documents_base.template_store import DocumentTemplateStore
from roborean_spec import (
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    TemplateManifest,
    WorkspaceValue,
)

logger = logging.getLogger(__name__)


@dataclass
class DocxSession:
    """Working DOCX document session.

    Attributes:
        document_id: Document definition identifier for this session.
        driver_id: Driver id that owns the session.
        document: python-docx ``Document`` being edited.
        ops_applied: Serialized operations applied so far.
        context: Template context values rendered by docxtpl.
    """

    document_id: str
    driver_id: str
    document: Any
    ops_applied: list[dict[str, Any]] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)


class DocxDocumentDriver:
    """Word document driver with flow ops and named slots.

    Attributes:
        driver_id: Stable driver identifier.
        manifest: Driver capability and media-type manifest.

        _template: Loaded ``.docx`` template bytes, if any.
        _manifest: Template sidecar manifest for required inputs.
    """

    driver_id: str = "roborean.docx"
    manifest: DocumentDriverManifest = DocumentDriverManifest(
        driverId="roborean.docx",
        version="0.3.0",
        irFamily="flow",
        capabilities=[
            "set_metadata",
            "replace_named_value",
            "flow.insert_paragraph",
            "flow.insert_heading",
            "finalize",
        ],
        supportsPreview=True,
        supportsBrowserExecution=False,
        supportsDiff=True,
        requiresBackend=True,
        templateMediaTypes=[
            "application/vnd.openxmlformats-officedocument"
            ".wordprocessingml.document"
        ],
    )

    _template: bytes | None
    _manifest: TemplateManifest | None

    def __init__(self) -> None:
        """Initialize empty template state."""
        self._template = None
        self._manifest = None

    def load_template(
        self,
        template_ref: str,
        *,
        store: DocumentTemplateStore,
        manifest: TemplateManifest,
    ) -> None:
        """Load ``.docx`` template bytes.

        Args:
            template_ref: Template identifier within the project package.
            store: Template store used to resolve template bytes.
            manifest: Validated template sidecar manifest.
        """
        self._template = store.load_bytes(template_ref)
        self._manifest = manifest

    def begin_session(
        self,
        workspace: Any,
        metadata: Mapping[str, Any],
    ) -> DocxSession:
        """Render docxtpl context then open a python-docx document.

        Args:
            workspace: Current workspace snapshot for template inputs.
            metadata: Session metadata such as ``documentId``.

        Returns:
            Open session bound to the rendered document.
        """
        assert self._template is not None

        # Render Jinja-style template slots from public workspace values.
        tpl = DocxTemplate(io.BytesIO(self._template))
        context: dict[str, Any] = {}
        if self._manifest is not None:
            for key in self._manifest.required_inputs:
                if key in workspace.values:
                    try:
                        context[key] = public_literal_value(
                            workspace.values[key]
                        )
                    except DriverError:
                        logger.debug(
                            "Skipping non-public template input %s",
                            key,
                            exc_info=True,
                        )
                        context[key] = ""

        # Materialize the rendered template into a python-docx Document.
        buffer = io.BytesIO()
        tpl.render(context)
        tpl.save(buffer)
        buffer.seek(0)
        document = Document(buffer)
        return DocxSession(
            document_id=str(metadata.get("documentId", "")),
            driver_id=self.driver_id,
            document=document,
            context=context,
        )

    def apply_operation(
        self, session: DocxSession, op: DocumentOperation
    ) -> None:
        """Apply flow / named-value operations.

        Args:
            session: Open DOCX session that receives the operation.
            op: Typed document operation to apply.

        Raises:
            UnsupportedOperationError: When the op is outside capabilities.
            DriverError: When a named-value payload is not a public literal.
        """
        assert_op_allowed(self.manifest, op)
        data = op.model_dump(mode="python", by_alias=True)
        session.ops_applied.append(op.model_dump(mode="json", by_alias=True))

        # Dispatch by operation name onto python-docx mutations.
        if op.op == "flow.insert_paragraph":
            text = "".join(run["text"] for run in data["runs"])
            session.document.add_paragraph(text)
        elif op.op == "flow.insert_heading":
            session.document.add_heading(
                str(data["text"]), level=int(data["level"])
            )
        elif op.op == "replace_named_value":
            value = TypeAdapter(WorkspaceValue).validate_python(data["value"])
            rendered = str(public_literal_value(value))
            needle = "{{" + str(data["name"]) + "}}"
            for paragraph in session.document.paragraphs:
                if needle in paragraph.text:
                    paragraph.text = paragraph.text.replace(needle, rendered)

    def finalize(self, session: DocxSession) -> None:
        """No-op finalize.

        Args:
            session: Open session about to be serialized.
        """
        return

    def serialize(self, session: DocxSession) -> bytes:
        """Return ``.docx`` bytes.

        Args:
            session: Finalized session to serialize.

        Returns:
            Binary Office Open XML document payload.
        """
        buffer = io.BytesIO()
        session.document.save(buffer)
        return buffer.getvalue()

    def preview(self, session: DocxSession) -> DocumentPreview:
        """Approximate HTML from paragraphs.

        Args:
            session: Finalized session to preview.

        Returns:
            HTML preview approximating paragraph and heading structure.
        """
        parts = ['<div class="roborean-docx">']
        for paragraph in session.document.paragraphs:
            style = paragraph.style.name if paragraph.style else ""
            tag = "p"

            # Map Word heading styles onto HTML heading tags.
            if style.startswith("Heading"):
                try:
                    level = int(style.replace("Heading ", ""))
                    tag = f"h{level}"
                except ValueError:
                    tag = "h2"
            parts.append(f"<{tag}>{paragraph.text}</{tag}>")
        parts.append("</div>")

        return DocumentPreview(
            documentId=session.document_id,
            mode="html",
            body="".join(parts),
            warnings=[],
            generatedAt=datetime.now(UTC).isoformat(),
            renderer={
                "package": "roborean-documents-docx",
                "version": "0.3.0",
            },
        )


def create_driver() -> DocxDocumentDriver:
    """Entry-point factory.

    Returns:
        New ``DocxDocumentDriver`` instance.
    """
    return DocxDocumentDriver()


def docx_paragraph_texts(data: bytes) -> list[str]:
    """Extract paragraph texts for semantic compare.

    Args:
        data: Serialized ``.docx`` artifact bytes.

    Returns:
        Ordered list of paragraph text strings.
    """
    document = Document(io.BytesIO(data))
    return [paragraph.text for paragraph in document.paragraphs]
