import { useEffect, useState, type ChangeEvent } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { FormStack, FormTextField } from "@roborean/ui";

import { DescribedMenuItem } from "./DescribedMenuItem.js";
import type { ConstraintDefinition } from "./schemaConstraints.js";

/**
 * Props for the add-constraint dialog.
 */
export type ConstraintDialogProps = {
  /** Whether the dialog is open. */
  open: boolean;

  /** Constraints the user can still add. */
  available: ConstraintDefinition[];

  /**
   * Called when the user confirms a new constraint.
   *
   * @param key - JSON Schema keyword.
   * @param value - Parsed constraint value.
   */
  onConfirm: (key: string, value: unknown) => void;

  /** Called when the dialog should close without changes. */
  onClose: () => void;
};

/**
 * Dialog for choosing and entering one JSON Schema constraint.
 *
 * @param props - Open state, available constraints, and handlers.
 * @returns Constraint dialog element.
 */
export function ConstraintDialog({
  open,
  available,
  onConfirm,
  onClose,
}: ConstraintDialogProps) {
  const [selectedKey, setSelectedKey] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset draft state whenever the dialog opens or options change.
  useEffect(() => {
    if (!open) {
      return;
    }

    const firstKey = available[0]?.key ?? "";
    setSelectedKey(firstKey);
    setInputValue("");
    setError(null);
  }, [available, open]);

  const selectedDefinition = available.find(
    (definition) => definition.key === selectedKey,
  );

  const handleConfirm = (): void => {
    if (!selectedDefinition) {
      return;
    }

    const parsed = selectedDefinition.parseInput(inputValue);
    if (parsed === null) {
      setError("Enter a valid value for this constraint.");
      return;
    }

    onConfirm(selectedDefinition.key, parsed);
    onClose();
  };

  const valueLabel =
    selectedDefinition?.inputKind === "csv-enum"
      ? "Allowed values (comma-separated)"
      : selectedDefinition?.inputKind === "predefined-pairs"
        ? "Predefined values (one per line)"
        : "Value";

  const isMultiline =
    selectedDefinition?.inputKind === "csv-enum" ||
    selectedDefinition?.inputKind === "predefined-pairs";

  const valueHelperText =
    selectedDefinition?.inputKind === "csv-enum" ||
    selectedDefinition?.inputKind === "predefined-pairs"
      ? selectedDefinition.description
      : error;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add constraint</DialogTitle>
      <DialogContent>
        <FormStack sx={{ pt: 1 }}>
          <FormTextField
            select
            size="small"
            label="Constraint"
            value={selectedKey}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setSelectedKey(event.target.value);
              setInputValue("");
              setError(null);
            }}
            disabled={available.length === 0}
            SelectProps={{
              renderValue: (selected) => {
                const definition = available.find(
                  (option) => option.key === selected,
                );
                return definition?.label ?? String(selected);
              },
            }}
          >
            {available.map((definition) => (
              <DescribedMenuItem
                key={definition.key}
                value={definition.key}
                label={definition.label}
                description={definition.description}
              />
            ))}
          </FormTextField>
          <FormTextField
            size="small"
            label={valueLabel}
            type={
              selectedDefinition?.inputKind === "number" ? "number" : "text"
            }
            multiline={isMultiline}
            minRows={isMultiline ? 3 : undefined}
            value={inputValue}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setInputValue(event.target.value);
              setError(null);
            }}
            error={error !== null}
            helperText={valueHelperText ?? undefined}
            disabled={!selectedDefinition}
          />
        </FormStack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedDefinition}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
