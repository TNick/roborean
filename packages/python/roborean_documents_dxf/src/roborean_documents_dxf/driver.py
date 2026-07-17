"""DXF document driver using ezdxf."""

import io
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

import ezdxf
from roborean_documents_base.capabilities import assert_op_allowed
from roborean_documents_base.template_store import DocumentTemplateStore
from roborean_spec import (
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    TemplateManifest,
)


@dataclass
class DxfSession:
    """ezdxf drawing session.

    Attributes:
        document_id: Document definition identifier for this session.
        driver_id: Driver id that owns the session.
        doc: ezdxf drawing document.
        msp: Modelspace used for entity insertion.
        ops_applied: Serialized operations applied so far.
        entities: Drawing-json entity records for preview consumers.
    """

    document_id: str
    driver_id: str
    doc: Any
    msp: Any
    ops_applied: list[dict[str, Any]] = field(default_factory=list)
    entities: list[dict[str, Any]] = field(default_factory=list)


class DxfDocumentDriver:
    """DXF drawing driver.

    Attributes:
        driver_id: Stable driver identifier.
        manifest: Driver capability and media-type manifest.

        _template: Optional base DXF template bytes.
        _manifest: Template sidecar manifest from ``load_template``.
    """

    driver_id: str = "roborean.dxf"
    manifest: DocumentDriverManifest = DocumentDriverManifest(
        driverId="roborean.dxf",
        version="0.3.0",
        irFamily="drawing",
        capabilities=[
            "set_metadata",
            "drawing.ensure_layer",
            "drawing.insert_polyline",
            "drawing.insert_text",
            "finalize",
        ],
        supportsPreview=True,
        supportsBrowserExecution=False,
        supportsDiff=True,
        requiresBackend=True,
        templateMediaTypes=["image/vnd.dxf", "application/dxf"],
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
        """Load optional base DXF bytes.

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
    ) -> DxfSession:
        """Open a DXF document from template or create a new one.

        Args:
            workspace: Current workspace snapshot (unused for DXF).
            metadata: Session metadata such as ``documentId``.

        Returns:
            Open session bound to an ezdxf drawing.
        """
        # Prefer an optional base drawing; otherwise start R2010 empty.
        if self._template:
            # ezdxf text parsing mis-detects $ACADVER when CR/LF is present.
            text = self._template.decode("utf-8").replace("\r\n", "\n")
            doc = ezdxf.read(io.StringIO(text))
        else:
            doc = ezdxf.new("R2010")

        return DxfSession(
            document_id=str(metadata.get("documentId", "")),
            driver_id=self.driver_id,
            doc=doc,
            msp=doc.modelspace(),
        )

    def apply_operation(
        self, session: DxfSession, op: DocumentOperation
    ) -> None:
        """Apply drawing operations.

        Args:
            session: Open DXF session that receives the operation.
            op: Typed document operation to apply.

        Raises:
            UnsupportedOperationError: When the op is outside capabilities.
        """
        assert_op_allowed(self.manifest, op)
        data = op.model_dump(mode="python", by_alias=True)
        session.ops_applied.append(op.model_dump(mode="json", by_alias=True))

        # Dispatch drawing ops onto the modelspace and preview entity list.
        if op.op == "drawing.ensure_layer":
            name = str(data["name"])
            if name not in session.doc.layers:
                session.doc.layers.add(name)
            session.entities.append({"type": "layer", "name": name})
        elif op.op == "drawing.insert_polyline":
            points = [tuple(point) for point in data["points"]]
            session.msp.add_lwpolyline(
                points, dxfattribs={"layer": str(data["layer"])}
            )
            session.entities.append(
                {
                    "type": "polyline",
                    "layer": data["layer"],
                    "points": data["points"],
                }
            )
        elif op.op == "drawing.insert_text":
            at = tuple(data["at"])
            height = float(data.get("height") or 2.5)
            session.msp.add_text(
                str(data["text"]),
                dxfattribs={
                    "layer": str(data["layer"]),
                    "height": height,
                    "insert": at,
                },
            )
            session.entities.append(
                {
                    "type": "text",
                    "layer": data["layer"],
                    "at": data["at"],
                    "text": data["text"],
                    "height": height,
                }
            )

    def finalize(self, session: DxfSession) -> None:
        """No-op finalize.

        Args:
            session: Open session about to be serialized.
        """
        return

    def serialize(self, session: DxfSession) -> bytes:
        """Return DXF text bytes.

        Args:
            session: Finalized session to serialize.

        Returns:
            UTF-8 encoded DXF text payload.
        """
        buffer = io.StringIO()
        session.doc.write(buffer)
        return buffer.getvalue().encode("utf-8")

    def preview(self, session: DxfSession) -> DocumentPreview:
        """Return drawing-json preview for canvas consumers.

        Args:
            session: Finalized session to preview.

        Returns:
            Drawing-json preview body built from recorded entities.
        """
        return DocumentPreview(
            documentId=session.document_id,
            mode="drawing-json",
            body={"entities": session.entities},
            warnings=[],
            generatedAt=datetime.now(UTC).isoformat(),
            renderer={
                "package": "roborean-documents-dxf",
                "version": "0.3.0",
            },
        )


def create_driver() -> DxfDocumentDriver:
    """Entry-point factory.

    Returns:
        New ``DxfDocumentDriver`` instance.
    """
    return DxfDocumentDriver()
