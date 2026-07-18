# Conformance fonts

Vendored TrueType fonts used for **deterministic PNG** golden tests (D05).

## RoboreanConformanceSans.ttf

Minimal font checked into this directory for CI and local byte-stable
`image/png` artifacts. Regenerate with:

```bash
python playground/gen_conformance_font.py
```

It is not a full UI font; it only outlines glyphs needed by conformance
fixtures (for example ``DRAFT``).

## Optional DejaVu Sans

You may replace or supplement with [DejaVu Sans](https://dejavu-fonts.github.io/)
(SIL Open Font License 1.1) as ``DejaVuSans.ttf`` and set document
``settings.textFont`` to that file name. The image driver loads fonts only
from this directory (via ``roborean_documents_image.fonts``).
