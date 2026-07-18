"""Tests for ACAD_TABLE cell tag substitution."""

from pathlib import Path

import ezdxf
from ezdxf.entities.acad_table import read_acad_table_content
from roborean_documents_dxf.acad_table_text import replace_in_acad_table

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "table_with_slot.dxf"


class TestAcadTableText:
    """ACAD_TABLE tag rewrite behavior."""

    def test_replaces_placeholder_in_table_cell(self) -> None:
        """Cell text is updated and readable after tag mutation."""
        doc = ezdxf.readfile(FIXTURE)
        table = doc.modelspace().query("ACAD_TABLE").first

        changed = replace_in_acad_table(table, "{{label}}", "Roborean")

        assert changed == ["Roborean"]
        assert read_acad_table_content(table)[0][0] == "Roborean"
