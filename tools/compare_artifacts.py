"""Compare golden document artifacts by media type."""

from __future__ import annotations

import io
import sys
from pathlib import Path

from PIL import Image
from roborean_documents_docx.driver import docx_paragraph_texts
from roborean_documents_xlsx.driver import xlsx_semantic_equal

# Compare modes written into expected.artifacts.json manifests.
COMPARE_BYTES = "bytes"
COMPARE_PIXELS = "pixels"
COMPARE_SEMANTIC = "semantic"
COMPARE_SKIP = "skip"


def artifact_compare_mode(media_type: str, path: str) -> str:
    """Choose how to compare a golden artifact.

    Args:
        media_type: MIME type from the run artifact metadata.
        path: Relative artifact path (used for suffix fallbacks).

    Returns:
        One of ``bytes``, ``pixels``, ``semantic``, or ``skip``.
    """
    suffix = Path(path).suffix.lower()

    # DXF writers embed timestamps and version GUIDs each render.
    if media_type.endswith("vnd.dxf") or suffix == ".dxf":
        return COMPARE_SKIP

    if (
        media_type.endswith("spreadsheetml.sheet")
        or media_type.endswith("wordprocessingml.document")
        or suffix in {".xlsx", ".docx"}
    ):
        return COMPARE_SEMANTIC

    # PNG/JPEG bytes differ across zlib/libpng builds; compare pixels.
    if media_type.startswith("image/") or suffix in {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
    }:
        return COMPARE_PIXELS

    return COMPARE_BYTES


def _compare_image_pixels(expected_bytes: bytes, actual_bytes: bytes) -> None:
    """Raise when decoded raster images differ.

    Args:
        expected_bytes: Golden image bytes.
        actual_bytes: Produced image bytes.

    Raises:
        AssertionError: When size, mode, or pixel data differs.
    """
    expected = Image.open(io.BytesIO(expected_bytes))
    actual = Image.open(io.BytesIO(actual_bytes))

    if expected.size != actual.size:
        raise AssertionError(
            "Image size mismatch: "
            f"expected {expected.size}, got {actual.size}"
        )

    # Normalize mode so RGB vs RGBA encodings of the same canvas fail
    # clearly after conversion rather than as opaque byte noise.
    expected_rgb = expected.convert("RGB")
    actual_rgb = actual.convert("RGB")
    if expected_rgb.tobytes() != actual_rgb.tobytes():
        raise AssertionError(
            f"Pixel mismatch for image: size={expected_rgb.size}"
        )


def compare_artifact_bytes(
    media_type: str,
    expected_bytes: bytes,
    actual_bytes: bytes,
    *,
    path: str = "",
) -> None:
    """Raise ``AssertionError`` when artifact bytes differ.

    Args:
        media_type: MIME type or logical format label.
        expected_bytes: Golden artifact bytes.
        actual_bytes: Produced artifact bytes.
        path: Optional relative path for suffix-based format detection.

    Raises:
        AssertionError: When comparison fails.
    """
    mode = artifact_compare_mode(media_type, path or "artifact.bin")
    suffix = Path(path).suffix.lower()

    if mode == COMPARE_SKIP:
        return

    if mode == COMPARE_PIXELS:
        _compare_image_pixels(expected_bytes, actual_bytes)
        return

    if mode == COMPARE_SEMANTIC:
        if media_type.endswith("spreadsheetml.sheet") or suffix == ".xlsx":
            if not xlsx_semantic_equal(expected_bytes, actual_bytes):
                raise AssertionError("XLSX semantic mismatch")
            return
        if (
            media_type.endswith("wordprocessingml.document")
            or suffix == ".docx"
        ):
            if docx_paragraph_texts(expected_bytes) != docx_paragraph_texts(
                actual_bytes
            ):
                raise AssertionError("DOCX paragraph text mismatch")
            return
        raise AssertionError(
            f"Unsupported semantic compare for {media_type} ({path})"
        )

    if expected_bytes != actual_bytes:
        raise AssertionError(
            f"Byte mismatch for {media_type}: "
            f"expected {len(expected_bytes)} bytes, "
            f"got {len(actual_bytes)} bytes"
        )


def compare_artifact(media_type: str, expected: Path, actual: Path) -> None:
    """Raise ``AssertionError`` when on-disk artifacts differ.

    Args:
        media_type: MIME type or logical format label.
        expected: Path to expected bytes on disk.
        actual: Path to actual bytes on disk.

    Raises:
        AssertionError: When comparison fails.
    """
    compare_artifact_bytes(
        media_type,
        expected.read_bytes(),
        actual.read_bytes(),
        path=expected.name,
    )


def main() -> int:
    """CLI entry: ``compare_artifacts.py <media> <expected> <actual>``."""
    if len(sys.argv) != 4:
        print("Usage: compare_artifacts.py <media-type> <expected> <actual>")
        return 2
    media_type, expected_raw, actual_raw = sys.argv[1:4]
    try:
        compare_artifact(media_type, Path(expected_raw), Path(actual_raw))
    except AssertionError as error:
        print(error)
        return 1
    print("Artifacts match.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
