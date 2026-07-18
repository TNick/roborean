"""In-place ACAD_TABLE cell string substitution."""

import logging
from typing import Any

from ezdxf.lldxf.tags import Tags, group_tags
from ezdxf.lldxf.types import DXFTag

logger = logging.getLogger(__name__)

_MAX_CHUNK = 250


def replace_in_acad_table(entity: Any, needle: str, rendered: str) -> list[str]:
    """Replace placeholder substrings in ACAD_TABLE cell text tags.

    Args:
        entity: Loaded ``ACAD_TABLE`` entity from ezdxf.
        needle: Placeholder token to search for (``{{name}}``).
        rendered: Replacement text substituted in place of the token.

    Returns:
        Post-replace cell text values that changed.
    """
    if entity.dxftype() != "ACAD_TABLE":
        return []

    try:
        acdb_table = entity.xtags.get_subclass("AcDbTable")
    except (AttributeError, KeyError):
        logger.debug(
            "Skipping ACAD_TABLE without AcDbTable subclass",
            exc_info=True,
        )
        return []

    if acdb_table.has_tag(302):
        return _replace_r2007_cells(acdb_table, needle, rendered)

    return _replace_r2004_cells(acdb_table, needle, rendered)


def _replace_r2007_cells(
    acdb_table: Tags, needle: str, rendered: str
) -> list[str]:
    """Replace ``302`` cell strings on R2007+ table tag layouts."""
    changed: list[str] = []

    for index, tag in enumerate(acdb_table):
        if tag.code != 302 or needle not in tag.value:
            continue
        new_value = tag.value.replace(needle, rendered)
        acdb_table[index] = DXFTag(302, new_value)
        changed.append(new_value)

    return changed


def _replace_r2004_cells(
    acdb_table: Tags, needle: str, rendered: str
) -> list[str]:
    """Replace chunked ``1``/``2``/``3`` cell strings on older layouts."""
    changed: list[str] = []
    rebuilt = Tags()

    for group in group_tags(acdb_table, splitcode=171):
        group_tags_obj = Tags(group)
        text = _cell_text(group_tags_obj)
        if text is not None and needle in text:
            new_value = text.replace(needle, rendered)
            changed.append(new_value)
            rebuilt.extend(_encode_r2004_group(group_tags_obj, new_value))
            continue
        rebuilt.extend(group_tags_obj)

    if changed:
        acdb_table.clear()
        acdb_table.extend(rebuilt)

    return changed


def _cell_text(group: Tags) -> str | None:
    """Return cell text for one table cell tag group, if present."""
    if group.has_tag(302):
        return str(group.get_first_value(302))

    chunks = [tag.value for tag in group if 1 <= tag.code <= 3]
    if not chunks:
        return None

    return "".join(str(chunk) for chunk in chunks)


def _encode_r2004_group(group: Tags, text: str) -> Tags:
    """Rebuild one R2004 cell group with updated text content."""
    split_tag = group[0]
    encoded = Tags([split_tag])

    if len(text) <= _MAX_CHUNK:
        encoded.append(DXFTag(1, text))
        return encoded

    offset = 0
    while len(text) - offset > _MAX_CHUNK:
        encoded.append(DXFTag(3, text[offset : offset + _MAX_CHUNK]))
        offset += _MAX_CHUNK
    encoded.append(DXFTag(1, text[offset:]))
    return encoded
