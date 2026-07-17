"""DXF document driver using ezdxf."""

import io
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Mapping

import ezdxf
from roborean_documents_base.capabilities import assert_op_allowed
from roborean_spec import (
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    TemplateManifest,
)


@dataclass
class DxfSession:
    """ezdxf drawing session."""

    document_id: str
    driver_id: str
    doc: Any
    msp: Any
    ops_applied: list[dict[str, Any]] = field(default_factory=list)
    entities: list[dict[str, Any]] = field(default_factory=list)


class DxfDocumentDriver:
    """DXF drawing driver."""

    driver_id = "roborean.dxf"
    manifest = DocumentDriverManifest(
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

    def __init__(self) -> None:
        """Initialize empty template state."""
        self._template: bytes | None = None
        self._manifest: TemplateManifest | None = None

    def load_template(self, template_ref, *, store, manifest) -> None:
        """Load optional base DXF bytes."""
        self._template = store.load_bytes(template_ref)
        self._manifest = manifest

    def begin_session(
        self, workspace, metadata: Mapping[str, Any]
    ) -> DxfSession:
        """Open a DXF document from template or create a new one."""
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
        """Apply drawing operations."""
        assert_op_allowed(self.manifest, op)
        data = op.model_dump(mode="python", by_alias=True)
        session.ops_applied.append(op.model_dump(mode="json", by_alias=True))
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
        """No-op finalize."""
        return

    def serialize(self, session: DxfSession) -> bytes:
        """Return DXF text bytes."""
        buffer = io.StringIO()
        session.doc.write(buffer)
        return buffer.getvalue().encode("utf-8")

    def preview(self, session: DxfSession) -> DocumentPreview:
        """Return drawing-json preview for canvas consumers."""
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
    """Entry-point factory."""
    return DxfDocumentDriver()
