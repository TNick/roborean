"""Markdown / CommonMark document driver."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from roborean_documents_base.capabilities import assert_op_allowed
from roborean_documents_base.template_store import DocumentTemplateStore
from roborean_spec import (
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    TemplateManifest,
)


@dataclass
class MarkdownSession:
    """AST buffer for Markdown generation.

    Attributes:
        document_id: Document definition identifier for this session.
        driver_id: Driver id that owns the session.
        nodes: Ordered flow/plain nodes to render.
        ops_applied: Serialized operations applied so far.
        template_prefix: Template text rendered ahead of nodes.
    """

    document_id: str
    driver_id: str
    nodes: list[dict[str, Any]] = field(default_factory=list)
    ops_applied: list[dict[str, Any]] = field(default_factory=list)
    template_prefix: str = ""


def render_commonmark(nodes: list[dict[str, Any]], prefix: str = "") -> str:
    """Render a minimal node list to CommonMark.

    Args:
        nodes: Ordered heading, paragraph, and table nodes.
        prefix: Optional template text placed before rendered nodes.

    Returns:
        CommonMark body ending with a trailing newline.
    """
    parts: list[str] = []
    if prefix:
        parts.append(prefix.rstrip("\n"))

    # Render each node kind into CommonMark fragments.
    for node in nodes:
        kind = node["kind"]
        if kind == "heading":
            parts.append("#" * int(node["level"]) + " " + node["text"])
        elif kind == "paragraph":
            parts.append(node["text"])
        elif kind == "table":
            rows = node["rows"]
            if not rows:
                continue
            header = rows[0]
            parts.append("| " + " | ".join(header) + " |")
            parts.append("| " + " | ".join("---" for _ in header) + " |")
            for row in rows[1:]:
                parts.append("| " + " | ".join(row) + " |")

    body = "\n\n".join(parts).rstrip() + "\n"
    return body


class MarkdownDocumentDriver:
    """CommonMark driver using flow operations.

    Attributes:
        driver_id: Stable driver identifier.
        manifest: Driver capability and media-type manifest.

        _template: Loaded Markdown template prefix text.
        _manifest: Template sidecar manifest from ``load_template``.
    """

    driver_id: str = "roborean.markdown"
    manifest: DocumentDriverManifest = DocumentDriverManifest(
        driverId="roborean.markdown",
        version="0.3.0",
        irFamily="flow",
        capabilities=[
            "set_metadata",
            "replace_named_value",
            "flow.insert_paragraph",
            "flow.insert_heading",
            "flow.replace_table_rows",
            "plain.append_text",
            "finalize",
        ],
        supportsPreview=True,
        supportsBrowserExecution=True,
        supportsDiff=True,
        requiresBackend=False,
        templateMediaTypes=["text/markdown"],
    )

    _template: str
    _manifest: TemplateManifest | None

    def __init__(self) -> None:
        """Initialize empty template state."""
        self._template = ""
        self._manifest = None

    def load_template(
        self,
        template_ref: str,
        *,
        store: DocumentTemplateStore,
        manifest: TemplateManifest,
    ) -> None:
        """Load Markdown template prefix.

        Args:
            template_ref: Template identifier within the project package.
            store: Template store used to resolve template bytes.
            manifest: Validated template sidecar manifest.
        """
        text = store.load_bytes(template_ref).decode("utf-8")
        self._template = text.replace("\r\n", "\n")
        self._manifest = manifest

    def begin_session(
        self,
        workspace: Any,
        metadata: Mapping[str, Any],
    ) -> MarkdownSession:
        """Start a Markdown session.

        Args:
            workspace: Current workspace snapshot (unused for Markdown).
            metadata: Session metadata such as ``documentId``.

        Returns:
            Open session with the loaded template prefix.
        """
        return MarkdownSession(
            document_id=str(metadata.get("documentId", "")),
            driver_id=self.driver_id,
            template_prefix=self._template,
        )

    def apply_operation(
        self, session: MarkdownSession, op: DocumentOperation
    ) -> None:
        """Apply one flow/plain operation.

        Args:
            session: Open Markdown session that receives the operation.
            op: Typed document operation to apply.

        Raises:
            UnsupportedOperationError: When the op is outside capabilities.
        """
        assert_op_allowed(self.manifest, op)
        data = op.model_dump(mode="python", by_alias=True)
        session.ops_applied.append(op.model_dump(mode="json", by_alias=True))

        # Append AST nodes or rewrite named slots in the template prefix.
        if op.op == "flow.insert_heading":
            session.nodes.append(
                {
                    "kind": "heading",
                    "level": data["level"],
                    "text": data["text"],
                }
            )
        elif op.op == "flow.insert_paragraph":
            text = "".join(run["text"] for run in data["runs"])
            session.nodes.append({"kind": "paragraph", "text": text})
        elif op.op == "flow.replace_table_rows":
            session.nodes.append(
                {"kind": "table", "table": data["table"], "rows": data["rows"]}
            )
        elif op.op == "plain.append_text":
            session.nodes.append({"kind": "paragraph", "text": data["text"]})
        elif op.op == "replace_named_value":
            value = data["value"]
            if isinstance(value, dict) and "value" in value:
                rendered = str(value["value"])
            else:
                rendered = str(value)
            session.template_prefix = session.template_prefix.replace(
                "{{" + str(data["name"]) + "}}", rendered
            )

    def finalize(self, session: MarkdownSession) -> None:
        """No-op finalize.

        Args:
            session: Open session about to be serialized.
        """
        return

    def serialize(self, session: MarkdownSession) -> bytes:
        """Return CommonMark UTF-8 bytes.

        Args:
            session: Finalized session to serialize.

        Returns:
            UTF-8 encoded CommonMark document.
        """
        body = render_commonmark(session.nodes, session.template_prefix)
        return body.encode("utf-8")

    def preview(self, session: MarkdownSession) -> DocumentPreview:
        """Identity preview of CommonMark text.

        Args:
            session: Finalized session to preview.

        Returns:
            Text preview matching the serialized CommonMark body.
        """
        return DocumentPreview(
            documentId=session.document_id,
            mode="text",
            body=self.serialize(session).decode("utf-8"),
            warnings=[],
            generatedAt=datetime.now(UTC).isoformat(),
            renderer={
                "package": "roborean-documents-markdown",
                "version": "0.3.0",
            },
        )


def create_driver() -> MarkdownDocumentDriver:
    """Entry-point factory.

    Returns:
        New ``MarkdownDocumentDriver`` instance.
    """
    return MarkdownDocumentDriver()
