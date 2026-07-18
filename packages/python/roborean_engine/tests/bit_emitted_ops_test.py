"""Static document op emission and registry capability audit."""

from pathlib import Path

import pytest
from roborean_engine.bit_emitted_ops import (
    collect_emitted_ops_from_bit_types,
    emitted_ops_for_bit,
    validate_registered_document_bit_types,
)
from roborean_engine.bits.registry import builtin_registry
from roborean_engine.compiler import (
    CompileError,
    CompileOptions,
    compile_project,
)
from roborean_engine.documents import (
    E_CAPABILITY_MISSING,
    default_driver_registry,
    validate_bit_document_capabilities,
)
from roborean_spec import Bit, Project


def _bit(**kwargs: object) -> Bit:
    """Build a minimal document bit for unit tests."""
    defaults = {
        "id": "b1",
        "type": "roborean.replace_named_value",
        "when": True,
        "config": {
            "documentId": "doc1",
            "name": "name",
            "fromKey": "name",
        },
        "reads": [],
        "writes": [],
        "emits": ["doc1"],
        "effectClass": "document",
        "onError": "abort",
        "capabilities": [],
    }
    defaults.update(kwargs)
    return Bit.model_validate(defaults)


class TestEmittedOpsForBit:
    """Per-bit static op collection."""

    def test_replace_named_value_fixed_op(self) -> None:
        """Fixed document bit emits one op kind."""
        bit = _bit()
        assert emitted_ops_for_bit(bit) == {"replace_named_value"}

    def test_append_text_flow_override(self) -> None:
        """append_text respects config op override."""
        bit = _bit(
            type="roborean.append_text",
            config={
                "documentId": "doc1",
                "text": "hi",
                "op": "flow.insert_paragraph",
            },
        )
        assert emitted_ops_for_bit(bit) == {"flow.insert_paragraph"}

    def test_sheet_set_cells_from_config(self) -> None:
        """sheet_set_cells emits only ops implied by config sections."""
        bit = _bit(
            type="roborean.sheet_set_cells",
            config={
                "documentId": "doc1",
                "cells": [{"sheet": "S", "cell": "A1", "fromKey": "name"}],
            },
        )
        assert emitted_ops_for_bit(bit) == {"sheet.set_cell"}

    def test_flow_ops_from_config_array(self) -> None:
        """Config-dynamic flow bit reads ops from config."""
        bit = _bit(
            type="roborean.flow_append_paragraph",
            config={
                "documentId": "doc1",
                "ops": [{"op": "flow.insert_heading", "level": 1, "text": "T"}],
            },
        )
        assert emitted_ops_for_bit(bit) == {"flow.insert_heading"}


class TestCollectEmittedOpsFromBitTypes:
    """Project-wide op union."""

    def test_unions_all_bits(self) -> None:
        """Collector merges ops from every project bit."""
        project = Project.model_validate(
            {
                "schemaVersion": "1.1.0",
                "id": "p1",
                "name": "P",
                "workspace": {"variables": []},
                "bits": [
                    {
                        "id": "a",
                        "type": "roborean.replace_named_value",
                        "when": True,
                        "config": {
                            "documentId": "d",
                            "name": "n",
                            "fromKey": "n",
                        },
                        "reads": [],
                        "writes": [],
                        "emits": ["d"],
                        "effectClass": "document",
                        "onError": "abort",
                        "capabilities": [],
                    },
                    {
                        "id": "b",
                        "type": "roborean.append_text",
                        "when": True,
                        "config": {"documentId": "d", "text": "x"},
                        "reads": [],
                        "writes": [],
                        "emits": ["d"],
                        "effectClass": "document",
                        "onError": "abort",
                        "capabilities": [],
                    },
                ],
                "documents": [],
                "templates": [],
                "pluginRequirements": [],
                "metadata": {},
            }
        )
        ops = collect_emitted_ops_from_bit_types(project)
        assert ops == {"replace_named_value", "plain.append_text"}


class TestValidateRegisteredDocumentBitTypes:
    """Registry-wide driver coverage for fixed emissions."""

    def test_builtin_document_bits_documented(self) -> None:
        """This tests that built-in document bit types have emission specs and
        driver coverage.
        """
        diagnostics = validate_registered_document_bit_types(
            builtin_registry(),
            default_driver_registry(),
        )
        codes = {item.code for item in diagnostics}
        assert "E_BIT_EMISSION_UNDOCUMENTED" not in codes
        assert "E_CAPABILITY_MISSING" not in codes


class TestValidateBitDocumentCapabilities:
    """Per-project capability checks use config-derived ops."""

    def test_flow_heading_fails_on_text_driver(self) -> None:
        """Dynamic flow op not supported by text driver is rejected."""
        project = Project.model_validate(
            {
                "schemaVersion": "1.1.0",
                "id": "p1",
                "name": "P",
                "workspace": {"variables": []},
                "bits": [
                    {
                        "id": "flow_bit",
                        "type": "roborean.flow_append_paragraph",
                        "when": True,
                        "config": {
                            "documentId": "hello_doc",
                            "ops": [
                                {
                                    "op": "flow.insert_heading",
                                    "level": 1,
                                    "text": "Title",
                                }
                            ],
                        },
                        "reads": [],
                        "writes": [],
                        "emits": ["hello_doc"],
                        "effectClass": "document",
                        "onError": "abort",
                        "capabilities": [],
                    }
                ],
                "documents": [
                    {
                        "id": "hello_doc",
                        "title": "Hello",
                        "type": "text",
                        "driver": "roborean.text",
                        "templateRef": "hello",
                        "outputTarget": "hello.txt",
                        "irFamily": "plain",
                        "settings": {},
                        "preview": {"mode": "text", "enabled": True},
                    }
                ],
                "templates": [{"id": "hello", "path": "templates/hello.txt"}],
                "pluginRequirements": [],
                "metadata": {},
            }
        )
        diagnostics = validate_bit_document_capabilities(project)
        assert any(item.code == E_CAPABILITY_MISSING for item in diagnostics)


class TestD99Regression:
    """Conformance capability-fail fixture still fails compile."""

    @pytest.fixture
    def d99_dir(self) -> Path:
        """Path to D99_capability_fail conformance package."""
        return (
            Path(__file__).resolve().parents[4]
            / "conformance"
            / "documents"
            / "D99_capability_fail"
        )

    def test_d99_compile_raises_capability_error(self, d99_dir: Path) -> None:
        """Sheet ops against text driver still fail at compile time."""
        import json

        project = Project.model_validate(
            json.loads((d99_dir / "project.json").read_text(encoding="utf-8"))
        )
        with pytest.raises(CompileError) as error:
            compile_project(
                project,
                options=CompileOptions(package_dir=d99_dir),
            )
        codes = {item.code for item in error.value.diagnostics}
        assert E_CAPABILITY_MISSING in codes
