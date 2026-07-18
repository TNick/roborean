"""Tests for the raster image document driver."""

import io

from PIL import Image
from roborean_documents_image.driver import ImageDocumentDriver
from roborean_documents_image.fonts import (
    DEFAULT_FONT_FILE,
    resolve_font_path,
    vendored_font_dir,
)
from roborean_spec import DocumentOperation


class TestImageDriver:
    """Raster driver behavior."""

    def test_vendored_font_present(self) -> None:
        """Conformance font file exists in the repository."""
        path = resolve_font_path(DEFAULT_FONT_FILE)
        assert path.is_file()
        assert path.parent == vendored_font_dir()

    def test_png_render_is_deterministic(self) -> None:
        """Same ops and settings produce identical PNG bytes twice."""
        driver = ImageDocumentDriver()
        settings = {
            "format": "PNG",
            "textFont": DEFAULT_FONT_FILE,
            "textFontSize": 16,
        }
        template = Image.new("RGB", (200, 100), "#FFFFFF")
        buffer = io.BytesIO()
        template.save(buffer, format="PNG")
        driver._template = buffer.getvalue()

        def render_once() -> bytes:
            session = driver.begin_session(
                {},
                {"documentId": "stamp", "settings": settings},
            )
            op = DocumentOperation.model_validate(
                {
                    "documentId": "stamp",
                    "op": "raster.draw_text",
                    "text": "DRAFT",
                    "anchor": [20, 40],
                }
            )
            driver.apply_operation(session, op)
            driver.finalize(session)
            return driver.serialize(session)

        first = render_once()
        second = render_once()
        assert first == second
        assert len(first) > 100
