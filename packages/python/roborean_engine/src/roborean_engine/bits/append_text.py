"""Emit plain.append_text or flow.insert_paragraph operations."""

from roborean_spec import DocumentOperation, WorkspacePatch

from .base import BitContext, BitOutput


class AppendTextHandler:
    """Append text to a document."""

    def execute(self, context: BitContext) -> BitOutput:
        """Build one document operation."""
        config = context.bit.config
        op_name = str(config.get("op", "plain.append_text"))
        if op_name == "flow.insert_paragraph":
            payload = {
                "documentId": config["documentId"],
                "op": "flow.insert_paragraph",
                "runs": [{"text": str(config["text"])}],
            }
        else:
            payload = {
                "documentId": config["documentId"],
                "op": "plain.append_text",
                "text": str(config["text"]),
            }
        op = DocumentOperation.model_validate(payload)
        return BitOutput(
            WorkspacePatch(ops=[]),
            [],
            [op.model_dump(mode="json", by_alias=True)],
        )
