"""Emit a replace_named_value document operation."""

from pydantic import TypeAdapter
from roborean_spec import DocumentOperation, WorkspacePatch, WorkspaceValue

from ..workspace import get_value
from .base import BitContext, BitOutput


class ReplaceNamedValueHandler:
    """Copy a workspace value into a named document slot."""

    def execute(self, context: BitContext) -> BitOutput:
        """Build one document operation."""
        config = context.bit.config
        if "fromKey" in config:
            value = get_value(context.workspace, str(config["fromKey"]))
        else:
            value = TypeAdapter(WorkspaceValue).validate_python(
                config["value"]
            )
        op = DocumentOperation.model_validate(
            {
                "documentId": config["documentId"],
                "op": "replace_named_value",
                "name": config["name"],
                "value": value.model_dump(mode="json", by_alias=True),
            }
        )
        return BitOutput(
            WorkspacePatch(ops=[]),
            [],
            [op.model_dump(mode="json", by_alias=True)],
        )
