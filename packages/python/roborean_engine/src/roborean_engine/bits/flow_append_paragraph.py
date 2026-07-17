"""Emit flow heading/paragraph/table operations."""

from roborean_spec import DocumentOperation, WorkspacePatch

from .base import BitContext, BitOutput


class FlowAppendParagraphHandler:
    """Emit flow document operations from bit config."""

    def execute(self, context: BitContext) -> BitOutput:
        """Build configured flow operations.

        Args:
            context: Bit inputs including document id and flow ops.

        Returns:
            Empty workspace patch and serialized document operations.
        """
        config = context.bit.config
        document_id = str(config["documentId"])
        ops = []

        # Validate each configured flow op against the document schema.
        for item in config.get("ops", []):
            payload = {"documentId": document_id, **item}
            op = DocumentOperation.model_validate(payload)
            ops.append(op.model_dump(mode="json", by_alias=True))

        return BitOutput(WorkspacePatch(ops=[]), [], ops)
