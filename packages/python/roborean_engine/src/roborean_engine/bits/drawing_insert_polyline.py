"""Emit drawing polyline/text operations."""

from roborean_spec import DocumentOperation, WorkspacePatch

from .base import BitContext, BitOutput


class DrawingInsertPolylineHandler:
    """Emit drawing document operations from bit config."""

    def execute(self, context: BitContext) -> BitOutput:
        """Build configured drawing operations."""
        config = context.bit.config
        document_id = str(config["documentId"])
        ops = []
        for item in config.get("ops", []):
            payload = {"documentId": document_id, **item}
            op = DocumentOperation.model_validate(payload)
            ops.append(op.model_dump(mode="json", by_alias=True))
        return BitOutput(WorkspacePatch(ops=[]), [], ops)
