import type { ChangeEvent, SyntheticEvent } from "react";
import type { JsonScalar } from "@roborean/spec";
import Autocomplete, {
  type AutocompleteRenderInputParams,
} from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import CloseIcon from "@mui/icons-material/Close";
import { FormStack, FormTextField } from "@roborean/ui";

import {
  DescribedMenuItem,
  describedOptionLabel,
} from "./DescribedMenuItem.js";
import {
  coerceLiteralValue,
  enumOptionToLiteral,
  literalValidationHelperText,
  parseLiteralFromRaw,
  readPredefinedOptions,
  readSchemaEnum,
  schemaAllowsNull,
  validateLiteralAgainstSchema,
  VALUE_TYPE_OPTIONS,
  type PredefinedOption,
  type ValueType,
} from "./schemaConstraints.js";

/**
 * Props for shared public-literal type and value fields.
 */
export type LiteralValueFieldsProps = {
  /** Current structured value type. */
  valueType: ValueType;

  /** Current literal scalar. */
  literalValue: JsonScalar;

  /** Optional JSON Schema used to validate the literal. */
  validationSchema?: Record<string, unknown>;

  /** Label for the scalar value input. */
  valueLabel?: string;

  /** Whether the value type selector is shown. */
  showValueType?: boolean;

  /**
   * Called when the user selects another value type.
   *
   * @param nextType - Selected value type.
   */
  onValueTypeChange: (nextType: ValueType) => void;

  /**
   * Called when the literal scalar changes.
   *
   * @param value - Updated scalar.
   */
  onLiteralChange: (value: JsonScalar) => void;
};

/**
 * Build nullable field props shared by text and Autocomplete inputs.
 *
 * @param literalValue - Current literal scalar.
 * @param nullable - Whether null is allowed.
 * @returns Placeholder and label shrink props for null display.
 */
function nullableFieldProps(
  literalValue: JsonScalar,
  nullable: boolean,
): { placeholder?: string; InputLabelProps?: { shrink: boolean } } {
  if (!nullable || literalValue !== null) {
    return {};
  }

  return {
    placeholder: "null",
    InputLabelProps: { shrink: true },
  };
}

/**
 * Clear adornment that sets a nullable literal to null.
 *
 * @param props - Nullable flag and clear handler.
 * @returns Input adornment or undefined.
 */
function NullableClearAdornment({
  nullable,
  show,
  onClear,
}: {
  /** Whether null is allowed for this field. */
  nullable: boolean;

  /** Whether the clear button should render. */
  show: boolean;

  /** Called when the user clears the value to null. */
  onClear: () => void;
}) {
  if (!nullable || !show) {
    return undefined;
  }

  return (
    <InputAdornment position="end">
      <IconButton
        size="small"
        aria-label="Clear value to null"
        edge="end"
        onClick={onClear}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </InputAdornment>
  );
}

/**
 * Shared value type selector and typed literal input with validation.
 *
 * @param props - Value type, literal, schema, and change handlers.
 * @returns Literal value field group.
 */
export function LiteralValueFields({
  valueType,
  literalValue,
  validationSchema,
  valueLabel = "Value",
  showValueType = true,
  onValueTypeChange,
  onLiteralChange,
}: LiteralValueFieldsProps) {
  const literalValidation = validationSchema
    ? validateLiteralAgainstSchema(
        validationSchema,
        valueType,
        literalValue ?? null,
      )
    : { valid: true, issues: [] };
  const validationHelperText = literalValidationHelperText(
    literalValidation.issues,
  );
  const nullable = validationSchema
    ? schemaAllowsNull(validationSchema)
    : false;
  const enumValues = readSchemaEnum(validationSchema);
  const predefinedOptions = readPredefinedOptions(validationSchema);
  const nullProps = nullableFieldProps(literalValue, nullable);

  const handleLiteralChange = (raw: string): void => {
    if (valueType === "boolean") {
      onLiteralChange(raw === "true");
      return;
    }

    if (valueType === "integer") {
      const parsed = Number.parseInt(raw, 10);
      onLiteralChange(
        Number.isInteger(parsed) ? parsed : coerceLiteralValue(raw, valueType),
      );
      return;
    }

    if (valueType === "number") {
      const parsed = Number.parseFloat(raw);
      onLiteralChange(
        Number.isFinite(parsed) ? parsed : coerceLiteralValue(raw, valueType),
      );
      return;
    }

    onLiteralChange(raw);
  };

  const handleClearToNull = (): void => {
    onLiteralChange(null);
  };

  const commonFieldProps = {
    size: "small" as const,
    label: valueLabel,
    error: !literalValidation.valid,
    helperText: literalValidation.valid ? undefined : validationHelperText,
  };

  const renderEnumAutocomplete = (): JSX.Element => {
    const options = enumValues ?? [];

    const selectedOption =
      literalValue === null
        ? null
        : (options.find(
            (option) => enumOptionToLiteral(option, valueType) === literalValue,
          ) ?? null);

    return (
      <Autocomplete
        size="small"
        options={options}
        value={selectedOption}
        freeSolo={false}
        autoHighlight
        disableClearable={!nullable}
        getOptionLabel={(option: unknown) => String(option)}
        isOptionEqualToValue={(option: unknown, value: unknown) =>
          option === value
        }
        onChange={(_event: SyntheticEvent, next: unknown | null) => {
          if (next === null) {
            if (nullable) {
              onLiteralChange(null);
            }
            return;
          }

          onLiteralChange(enumOptionToLiteral(next, valueType));
        }}
        renderInput={(params: AutocompleteRenderInputParams) => (
          <FormTextField {...params} {...commonFieldProps} {...nullProps} />
        )}
      />
    );
  };

  const renderPredefinedAutocomplete = (): JSX.Element => {
    const options = predefinedOptions ?? [];

    const selectedOption =
      literalValue === null
        ? null
        : (options.find((option) => option.value === literalValue) ?? null);

    const inputValue =
      literalValue === null
        ? ""
        : selectedOption
          ? (selectedOption.label ?? String(selectedOption.value))
          : String(literalValue);

    return (
      <Autocomplete<PredefinedOption, false, boolean, true>
        size="small"
        options={options}
        value={selectedOption}
        inputValue={inputValue}
        freeSolo
        autoHighlight
        disableClearable={!nullable}
        getOptionLabel={(option: PredefinedOption | string) => {
          if (typeof option === "string") {
            return option;
          }

          return option.label ?? String(option.value);
        }}
        isOptionEqualToValue={(
          option: PredefinedOption | string,
          value: PredefinedOption | string,
        ) => {
          if (typeof option === "string" || typeof value === "string") {
            return option === value;
          }

          return option.value === value.value;
        }}
        onChange={(
          _event: SyntheticEvent,
          next: PredefinedOption | string | null,
        ) => {
          if (next === null) {
            if (nullable) {
              onLiteralChange(null);
            }
            return;
          }

          if (typeof next === "string") {
            onLiteralChange(parseLiteralFromRaw(next, valueType));
            return;
          }

          onLiteralChange(next.value);
        }}
        onInputChange={(
          _event: SyntheticEvent,
          next: string,
          reason: string,
        ) => {
          if (reason === "input") {
            onLiteralChange(parseLiteralFromRaw(next, valueType));
          }
        }}
        renderInput={(params: AutocompleteRenderInputParams) => (
          <FormTextField {...params} {...commonFieldProps} {...nullProps} />
        )}
      />
    );
  };

  const renderPlainField = (): JSX.Element => {
    const showClear = literalValue !== null;

    return (
      <FormTextField
        {...commonFieldProps}
        {...nullProps}
        type={
          valueType === "date"
            ? "date"
            : valueType === "integer" || valueType === "number"
              ? "number"
              : "text"
        }
        InputLabelProps={
          valueType === "date"
            ? { shrink: true, ...nullProps.InputLabelProps }
            : nullProps.InputLabelProps
        }
        value={literalValue === null ? "" : String(literalValue ?? "")}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          handleLiteralChange(event.target.value)
        }
        InputProps={{
          endAdornment: (
            <NullableClearAdornment
              nullable={nullable}
              show={showClear}
              onClear={handleClearToNull}
            />
          ),
        }}
      />
    );
  };

  const renderBooleanField = (): JSX.Element => {
    const showClear = literalValue !== null;

    return (
      <FormTextField
        {...commonFieldProps}
        {...nullProps}
        select
        value={
          literalValue === null ? "" : literalValue === true ? "true" : "false"
        }
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          handleLiteralChange(event.target.value)
        }
        SelectProps={{
          displayEmpty: nullable && literalValue === null,
          renderValue: (selected: unknown) => {
            if (literalValue === null) {
              return "null";
            }

            return selected === "true" ? "True" : "False";
          },
        }}
        InputProps={{
          endAdornment: (
            <NullableClearAdornment
              nullable={nullable}
              show={showClear}
              onClear={handleClearToNull}
            />
          ),
        }}
      >
        <MenuItem value="true">True</MenuItem>
        <MenuItem value="false">False</MenuItem>
      </FormTextField>
    );
  };

  const literalField =
    enumValues !== undefined
      ? renderEnumAutocomplete()
      : predefinedOptions !== undefined
        ? renderPredefinedAutocomplete()
        : valueType === "boolean"
          ? renderBooleanField()
          : renderPlainField();

  return (
    <FormStack>
      {showValueType ? (
        <FormTextField
          select
          size="small"
          label="Value type"
          value={valueType}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onValueTypeChange(event.target.value as ValueType)
          }
          SelectProps={{
            renderValue: (selected: unknown) =>
              describedOptionLabel(VALUE_TYPE_OPTIONS, String(selected)),
          }}
        >
          {VALUE_TYPE_OPTIONS.map((option) => (
            <DescribedMenuItem
              key={option.value}
              value={option.value}
              label={option.label}
              description={option.description}
            />
          ))}
        </FormTextField>
      ) : null}
      {literalField}
    </FormStack>
  );
}
