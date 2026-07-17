"""Emit sheet.set_cell / sheet.set_formula operations."""

from pydantic import TypeAdapter
from roborean_spec import DocumentOperation, WorkspacePatch, WorkspaceValue

from ..workspace import get_value
from .base import BitContext, BitOutput


class SheetSetCellsHandler:
    """Write multiple spreadsheet cells from config."""

    def execute(self, context: BitContext) -> BitOutput:
        """Build document operations for each configured cell.

        Args:
            context: Bit inputs including document id, cells, and formulas.

        Returns:
            Empty workspace patch and sheet document operations.
        """
        config = context.bit.config
        document_id = str(config["documentId"])
        ops = []

        # Emit set_cell ops from literals or workspace keys.
        for cell in config.get("cells", []):
            if "fromKey" in cell:
                value = get_value(context.workspace, str(cell["fromKey"]))
            else:
                value = TypeAdapter(WorkspaceValue).validate_python(
                    cell["value"]
                )
            op = DocumentOperation.model_validate(
                {
                    "documentId": document_id,
                    "op": "sheet.set_cell",
                    "sheet": cell["sheet"],
                    "cell": cell["cell"],
                    "value": value.model_dump(mode="json", by_alias=True),
                }
            )
            ops.append(op.model_dump(mode="json", by_alias=True))

        # Emit set_formula ops for configured formula cells.
        for formula in config.get("formulas", []):
            op = DocumentOperation.model_validate(
                {
                    "documentId": document_id,
                    "op": "sheet.set_formula",
                    "sheet": formula["sheet"],
                    "cell": formula["cell"],
                    "formula": formula["formula"],
                }
            )
            ops.append(op.model_dump(mode="json", by_alias=True))

        return BitOutput(WorkspacePatch(ops=[]), [], ops)
