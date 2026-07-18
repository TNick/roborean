"""Deterministic raster fonts for conformance and production renders."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import ImageFont
from roborean_spec.schema_loader import find_repo_root

DEFAULT_FONT_FILE = "RoboreanConformanceSans.ttf"
DEFAULT_FONT_SIZE = 16


def vendored_font_dir() -> Path:
    """Return the repository directory of vendored conformance fonts.

    Returns:
        Absolute path to ``conformance/fixtures/fonts/``.
    """
    return find_repo_root() / "conformance" / "fixtures" / "fonts"


def resolve_font_path(name: str | None) -> Path:
    """Resolve a font file name under the vendored fonts directory.

    Args:
        name: File name such as ``DejaVuSans.ttf``; defaults to the
            repository standard font.

    Returns:
        Absolute path to an existing ``.ttf`` file.

    Raises:
        FileNotFoundError: When the font file is missing.
    """
    filename = name or DEFAULT_FONT_FILE
    path = vendored_font_dir() / filename
    if not path.is_file():
        raise FileNotFoundError("Missing vendored font: %s" % path)
    return path


@lru_cache(maxsize=8)
def load_truetype_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    """Load and cache a TrueType font at a fixed pixel size.

    Args:
        path: Absolute path to a ``.ttf`` file.
        size: Font size in pixels.

    Returns:
        Pillow FreeType font instance.
    """
    return ImageFont.truetype(path, size=size)


def raster_font_for_operation(
    op_data: dict[str, Any],
    settings: dict[str, Any],
) -> ImageFont.FreeTypeFont:
    """Pick the raster font for one ``raster.draw_text`` operation.

    Args:
        op_data: Operation payload (may include ``font``).
        settings: Document ``settings`` from the project definition.

    Returns:
        Loaded TrueType font for deterministic text rendering.
    """
    font_name = op_data.get("font") or settings.get("textFont")
    size_raw = settings.get("textFontSize", DEFAULT_FONT_SIZE)
    size = int(size_raw)
    path = resolve_font_path(str(font_name) if font_name is not None else None)
    return load_truetype_font(str(path), size)
