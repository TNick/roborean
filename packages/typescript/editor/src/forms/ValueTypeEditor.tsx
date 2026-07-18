import { useState } from "react";
import type { Variable } from "@roborean/spec";
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { FormStack } from "@roborean/ui";

import { ConstraintDialog } from "./ConstraintDialog.js";
import { LiteralValueFields } from "./LiteralValueFields.js";
import {
  applyValueType,
  availableConstraints,
  coerceLiteralValue,
  failingConstraintKeywords,
  listConstraints,
  removeConstraint,
  schemaAllowsNull,
  setConstraint,
  setSchemaNullable,
  validateLiteralAgainstSchema,
  valueTypeFromVariable,
} from "./schemaConstraints.js";

/**
 * Props for the structured public-literal value editor.
 */
export type ValueTypeEditorProps = {
  /** Variable being edited. */
  variable: Variable;

  /**
   * Called when the user changes the variable.
   *
   * @param next - Updated variable document.
   */
  onChange: (next: Variable) => void;
};

/**
 * Integrated editor for value type, default literal, and JSON Schema constraints.
 *
 * @param props - Variable and change handler.
 * @returns Value type editor UI.
 */
export function ValueTypeEditor({ variable, onChange }: ValueTypeEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const defaultValue = variable.defaultValue;
  if (defaultValue.kind !== "public_literal") {
    return null;
  }

  const valueType = valueTypeFromVariable(variable);
  const activeConstraints = listConstraints(variable.schema, valueType);
  const addableConstraints = availableConstraints(variable.schema, valueType);
  const literalValidation = validateLiteralAgainstSchema(
    variable.schema,
    valueType,
    defaultValue.value ?? null,
  );
  const failedKeywords = failingConstraintKeywords(literalValidation.issues);

  const handleNullableChange = (nullable: boolean): void => {
    const nextSchema = setSchemaNullable(variable.schema, nullable);
    let nextDefault = defaultValue;

    if (!nullable && defaultValue.value === null) {
      nextDefault = {
        ...defaultValue,
        value: coerceLiteralValue(null, valueType, nextSchema),
      };
    }

    onChange({
      ...variable,
      schema: nextSchema,
      defaultValue: nextDefault,
    });
  };

  return (
    <FormStack>
      <LiteralValueFields
        valueType={valueType}
        literalValue={defaultValue.value ?? null}
        validationSchema={variable.schema}
        valueLabel="Default value"
        onValueTypeChange={(nextType) =>
          onChange(applyValueType(variable, nextType))
        }
        onLiteralChange={(literalValue) =>
          onChange({
            ...variable,
            defaultValue: { ...defaultValue, value: literalValue },
          })
        }
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={schemaAllowsNull(variable.schema)}
            onChange={(_event, checked) => handleNullableChange(checked)}
          />
        }
        label="Allow null"
      />
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="subtitle2">Constraints</Typography>
          <Tooltip
            title={
              addableConstraints.length === 0
                ? "All constraints for this type are already set"
                : "Add constraint"
            }
          >
            <span>
              <IconButton
                size="small"
                aria-label="Add constraint"
                disabled={addableConstraints.length === 0}
                onClick={() => setDialogOpen(true)}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {activeConstraints.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No constraints yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {activeConstraints.map((constraint) => {
              const failed = failedKeywords.has(constraint.key);

              return (
                <Stack
                  key={constraint.key}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      color={failed ? "error" : "text.primary"}
                    >
                      {constraint.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      noWrap
                      color={failed ? "error" : "text.secondary"}
                    >
                      {constraint.displayValue}
                    </Typography>
                  </Box>
                  <Tooltip title="Remove constraint">
                    <IconButton
                      size="small"
                      aria-label={`Remove ${constraint.label}`}
                      onClick={() =>
                        onChange({
                          ...variable,
                          schema: removeConstraint(
                            variable.schema,
                            constraint.key,
                          ),
                        })
                      }
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              );
            })}
          </Stack>
        )}
      </Box>
      <ConstraintDialog
        open={dialogOpen}
        available={addableConstraints}
        onClose={() => setDialogOpen(false)}
        onConfirm={(key, value) =>
          onChange({
            ...variable,
            schema: setConstraint(variable.schema, valueType, key, value),
          })
        }
      />
    </FormStack>
  );
}
