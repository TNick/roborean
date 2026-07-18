"""Tests for the DXF document driver."""

import io
from pathlib import Path

import ezdxf
from ezdxf.entities.acad_table import read_acad_table_content
from ezdxf.math import Vec2
from roborean_documents_dxf.driver import DxfDocumentDriver
from roborean_spec import DocumentOperation

TABLE_FIXTURE = (
    Path(__file__).resolve().parent / "fixtures" / "table_with_slot.dxf"
)


def _named_value_template_bytes() -> bytes:
    """Build a DXF template with TEXT, MTEXT, and ATTRIB placeholders."""
    doc = ezdxf.new("R2010")
    msp = doc.modelspace()
    msp.add_text(
        "{{title}}",
        dxfattribs={"layer": "0", "height": 5.0, "insert": (0.0, 0.0)},
    )
    msp.add_mtext(
        "{{body}}",
        dxfattribs={"layer": "0", "insert": (0.0, 10.0)},
    )

    block = doc.blocks.new(name="TITLEBLOCK")
    block.add_attdef("OWNER", (0.0, 0.0), dxfattribs={"height": 2.5})
    insert = msp.add_blockref("TITLEBLOCK", (0.0, 20.0))
    insert.add_attrib("OWNER", "{{owner}}", insert=(0.0, 20.0))

    buffer = io.StringIO()
    doc.write(buffer)
    return buffer.getvalue().encode("utf-8")


def _replace_op(name: str, value: str) -> DocumentOperation:
    """Build a replace_named_value operation for tests."""
    return DocumentOperation.model_validate(
        {
            "documentId": "named",
            "op": "replace_named_value",
            "name": name,
            "value": {
                "kind": "public_literal",
                "dataType": "string",
                "value": value,
            },
        }
    )


class TestDxfReplaceNamedValue:
    """Named-value substitution in loaded DXF templates."""

    def test_replaces_text_mtext_and_attrib(self) -> None:
        """Placeholders are removed and preview entities are recorded."""
        driver = DxfDocumentDriver()
        driver._template = _named_value_template_bytes()

        session = driver.begin_session({}, {"documentId": "named"})
        driver.apply_operation(session, _replace_op("title", "Roborean"))
        driver.apply_operation(
            session, _replace_op("body", "Generated drawing")
        )
        driver.apply_operation(session, _replace_op("owner", "Ada"))
        driver.finalize(session)

        payload = driver.serialize(session).decode("utf-8")
        assert "{{title}}" not in payload
        assert "{{body}}" not in payload
        assert "{{owner}}" not in payload
        assert "Roborean" in payload
        assert "Generated drawing" in payload
        assert "Ada" in payload

        preview = driver.preview(session)
        assert preview.body == {
            "entities": [
                {"type": "text", "text": "Roborean"},
                {"type": "mtext", "text": "Generated drawing"},
                {"type": "attrib", "text": "Ada"},
            ]
        }


def _extended_template_bytes() -> bytes:
    """Build a template with ATTDEF, MLEADER, DIMENSION, and ACAD_TABLE."""
    doc = ezdxf.readfile(TABLE_FIXTURE)
    msp = doc.modelspace()

    block = doc.blocks.new("ATTRBLK")
    attdef = block.add_attdef("SLOT", (0.0, 0.0), dxfattribs={"height": 2.5})
    attdef.dxf.text = "{{attdef_slot}}"
    msp.add_blockref("ATTRBLK", (0.0, 30.0))

    msp.add_linear_dim(
        base=(50.0, 0.0), p1=(50.0, 0.0), p2=(60.0, 0.0)
    ).render()
    for dimension in msp.query("DIMENSION"):
        dimension.dxf.text = "{{dim_label}}"

    builder = msp.add_multileader_mtext()
    builder.quick_leader("{{note}}", Vec2(70.0, 0.0), Vec2(75.0, 5.0))
    builder.build(Vec2(80.0, 10.0))

    buffer = io.StringIO()
    doc.write(buffer)
    return buffer.getvalue().encode("utf-8")


class TestDxfExtendedReplaceNamedValue:
    """Extended entity substitution beyond TEXT, MTEXT, and ATTRIB."""

    def test_replaces_attdef_mleader_dimension_and_table(self) -> None:
        """All extended carriers lose placeholders and update preview."""
        driver = DxfDocumentDriver()
        driver._template = _extended_template_bytes()

        session = driver.begin_session({}, {"documentId": "extended"})
        driver.apply_operation(session, _replace_op("attdef_slot", "Block"))
        driver.apply_operation(session, _replace_op("note", "Callout"))
        driver.apply_operation(session, _replace_op("dim_label", "Width"))
        driver.apply_operation(session, _replace_op("label", "Table title"))
        driver.finalize(session)

        payload = driver.serialize(session).decode("utf-8")
        assert "{{attdef_slot}}" not in payload
        assert "{{note}}" not in payload
        assert "{{dim_label}}" not in payload
        assert "{{label}}" not in payload
        assert "Block" in payload
        assert "Callout" in payload
        assert "Width" in payload
        assert "Table title" in payload

        table = session.msp.query("ACAD_TABLE").first
        assert read_acad_table_content(table)[0][0] == "Table title"

        preview = driver.preview(session)
        assert preview.body == {
            "entities": [
                {"type": "attdef", "text": "Block"},
                {"type": "mleader", "text": "Callout"},
                {"type": "dimension", "text": "Width"},
                {"type": "acad_table", "text": "Table title"},
            ]
        }
