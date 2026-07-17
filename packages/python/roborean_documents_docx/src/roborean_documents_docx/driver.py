"""DOCX document driver using docxtpl and python-docx."""

import io
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Mapping

from docx import Document
from docxtpl import DocxTemplate
from pydantic import TypeAdapter
from roborean_documents_base.capabilities import assert_op_allowed
from roborean_documents_base.errors import DriverError
from roborean_documents_base.resolve_values import public_literal_value
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
    """Working DOCX document session."""

    document_id: str
    driver_id: str
    document: Any
    ops_applied: list[dict[str, Any]] = field(default_factory=list)
    context: dict[str, Any] = field(default_factory=dict)


class DocxDocumentDriver:
    """Word document driver with flow ops and named slots."""

    driver_id = "roborean.docx"
    manifest = DocumentDriverManifest(
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

    def __init__(self) -> None:
        """Initialize empty template state."""
        self._template: bytes | None = None
        self._manifest: TemplateManifest | None = None

    def load_template(self, template_ref, *, store, manifest) -> None:
        """Load .docx template bytes."""
        self._template = store.load_bytes(template_ref)
        self._manifest = manifest

    def begin_session(
        self, workspace, metadata: Mapping[str, Any]
    ) -> DocxSession:
        """Render docxtpl context then open a python-docx document."""
        assert self._template is not None
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
        """Apply flow / named-value operations."""
        assert_op_allowed(self.manifest, op)
        data = op.model_dump(mode="python", by_alias=True)
        session.ops_applied.append(op.model_dump(mode="json", by_alias=True))
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
        """No-op finalize."""
        return

    def serialize(self, session: DocxSession) -> bytes:
        """Return .docx bytes."""
        buffer = io.BytesIO()
        session.document.save(buffer)
        return buffer.getvalue()

    def preview(self, session: DocxSession) -> DocumentPreview:
        """Approximate HTML from paragraphs."""
        parts = ['<div class="roborean-docx">']
        for paragraph in session.document.paragraphs:
            style = paragraph.style.name if paragraph.style else ""
            tag = "p"
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
    """Entry-point factory."""
    return DocxDocumentDriver()


def docx_paragraph_texts(data: bytes) -> list[str]:
    """Extract paragraph texts for semantic compare."""
    document = Document(io.BytesIO(data))
    return [paragraph.text for paragraph in document.paragraphs]
