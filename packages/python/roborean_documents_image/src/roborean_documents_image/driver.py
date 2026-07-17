"""Raster image document driver using Pillow."""

import io
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Mapping

from PIL import Image, ImageDraw, ImageFont
from roborean_documents_base.capabilities import assert_op_allowed
from roborean_spec import (
    DocumentDriverManifest,
    DocumentOperation,
    DocumentPreview,
    TemplateManifest,
)


@dataclass
class ImageSession:
    """Pillow image session."""

    document_id: str
    driver_id: str
    image: Any
    draw: Any
    ops_applied: list[dict[str, Any]] = field(default_factory=list)
    drawn_texts: list[dict[str, Any]] = field(default_factory=list)
    format: str = "PNG"


class ImageDocumentDriver:
    """PNG/JPEG raster driver."""

    driver_id = "roborean.image"
    manifest = DocumentDriverManifest(
        driverId="roborean.image",
        version="0.3.0",
        irFamily="raster",
        capabilities=[
            "set_metadata",
            "raster.draw_text",
            "raster.set_size",
            "finalize",
        ],
        supportsPreview=True,
        supportsBrowserExecution=False,
        supportsDiff=True,
        requiresBackend=True,
        templateMediaTypes=["image/png"],
    )

    def __init__(self) -> None:
        """Initialize empty template state."""
        self._template: bytes | None = None
        self._manifest: TemplateManifest | None = None
        self._settings: dict[str, Any] = {}

    def load_template(self, template_ref, *, store, manifest) -> None:
        """Load optional base image bytes."""
        self._template = store.load_bytes(template_ref)
        self._manifest = manifest

    def begin_session(
        self, workspace, metadata: Mapping[str, Any]
    ) -> ImageSession:
        """Create a canvas from template or blank settings."""
        settings = dict(metadata.get("settings") or {})
        self._settings = settings
        if self._template:
            image = Image.open(io.BytesIO(self._template)).convert("RGB")
        else:
            width = int(settings.get("width", 800))
            height = int(settings.get("height", 600))
            background = settings.get("background", "#FFFFFF")
            image = Image.new("RGB", (width, height), background)
        return ImageSession(
            document_id=str(metadata.get("documentId", "")),
            driver_id=self.driver_id,
            image=image,
            draw=ImageDraw.Draw(image),
            format=str(settings.get("format", "PNG")).upper(),
        )

    def apply_operation(
        self, session: ImageSession, op: DocumentOperation
    ) -> None:
        """Apply raster operations."""
        assert_op_allowed(self.manifest, op)
        data = op.model_dump(mode="python", by_alias=True)
        session.ops_applied.append(op.model_dump(mode="json", by_alias=True))
        if op.op == "raster.set_size":
            size = (int(data["width"]), int(data["height"]))
            session.image = session.image.resize(size)
            session.draw = ImageDraw.Draw(session.image)
        elif op.op == "raster.draw_text":
            anchor = (int(data["anchor"][0]), int(data["anchor"][1]))
            text = str(data["text"])
            font = ImageFont.load_default()
            session.draw.text(anchor, text, fill="black", font=font)
            session.drawn_texts.append({"text": text, "anchor": list(anchor)})

    def finalize(self, session: ImageSession) -> None:
        """No-op finalize."""
        return

    def serialize(self, session: ImageSession) -> bytes:
        """Return image bytes."""
        buffer = io.BytesIO()
        session.image.save(buffer, format=session.format)
        return buffer.getvalue()

    def preview(self, session: ImageSession) -> DocumentPreview:
        """Return drawing metadata for semantic preview."""
        return DocumentPreview(
            documentId=session.document_id,
            mode="drawing-json",
            body={
                "size": list(session.image.size),
                "texts": session.drawn_texts,
            },
            warnings=[],
            generatedAt=datetime.now(UTC).isoformat(),
            renderer={
                "package": "roborean-documents-image",
                "version": "0.3.0",
            },
        )


def create_driver() -> ImageDocumentDriver:
    """Entry-point factory."""
    return ImageDocumentDriver()
