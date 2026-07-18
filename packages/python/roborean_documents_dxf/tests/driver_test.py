"""Tests for the DXF document driver."""

import io

import ezdxf
from roborean_documents_dxf.driver import DxfDocumentDriver
from roborean_spec import DocumentOperation


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
