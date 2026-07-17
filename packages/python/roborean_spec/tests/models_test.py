"""Tests for schema-backed Pydantic models."""

import json

import pytest
from pydantic import ValidationError
from roborean_spec import project_from_dict, project_to_dict
from roborean_spec.models import PublicLiteral, Variable


class TestModels:
    """Verify model parsing and JSON round trips."""

    def test_project_round_trip(self, conformance_dir) -> None:
        """Preserve the canonical project representation."""
        data = json.loads(
            (conformance_dir / "projects" / "01_minimal.json").read_text()
        )

        assert project_to_dict(project_from_dict(data)) == data

    def test_unknown_workspace_kind_fails(self) -> None:
        """Reject a workspace value outside the discriminated union."""
        with pytest.raises(ValidationError):
            Variable.model_validate(
                {
                    "key": "value",
                    "schema": {},
                    "defaultValue": {"kind": "unknown"},
                    "exposure": "clientVisible",
                }
            )

    def test_public_literal(self) -> None:
        """Parse a public literal through its explicit model."""
        value = PublicLiteral(
            kind="public_literal",
            dataType="string",
            value="Hello",
        )

        assert value.value == "Hello"
