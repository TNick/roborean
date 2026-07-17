"""Emit raster.draw_text operations."""

from roborean_spec import DocumentOperation, WorkspacePatch

from .base import BitContext, BitOutput


class RasterDrawTextHandler:
    """Emit raster document operations from bit config."""

    def execute(self, context: BitContext) -> BitOutput:
        """Build configured raster operations.

        Args:
            context: Bit inputs including document id and raster ops.

        Returns:
            Empty workspace patch and serialized document operations.
        """
        config = context.bit.config
        document_id = str(config["documentId"])
        ops = []

        # Validate each configured raster op against the document schema.
        for item in config.get("ops", []):
            payload = {"documentId": document_id, **item}
            op = DocumentOperation.model_validate(payload)
            ops.append(op.model_dump(mode="json", by_alias=True))

        return BitOutput(WorkspacePatch(ops=[]), [], ops)
