import { useEffect, type ChangeEvent } from "react";
import type { WorkspaceValue } from "@roborean/spec";
import { FormStack, FormTextField, Typography } from "@roborean/ui";

import {
  DescribedMenuItem,
  describedOptionLabel,
} from "./DescribedMenuItem.js";
import { LiteralValueFields } from "./LiteralValueFields.js";
import {
  applyPublicLiteralValueType,
  VALUE_TYPE_OPTIONS,
  valueTypeFromPublicLiteral,
  valueTypeFromSchema,
} from "./schemaConstraints.js";
import {
  bindPublicLiteralToVariableSchema,
  defaultWorkspaceValueForKind,
} from "./workspaceValueDefaults.js";
import { VALUE_KIND_OPTIONS } from "./variableOptions.js";

/**
 * Props for editing one workspace value document.
 */
export type WorkspaceValueEditorProps = {
  /** Workspace value being edited. */
  value: WorkspaceValue;

  /**
   * Called when the workspace value changes.
   *
   * @param next - Updated workspace value.
   */
  onChange: (next: WorkspaceValue) => void;

  /** Optional JSON Schema for public literal validation. */
  validationSchema?: Record<string, unknown>;

  /**
   * Declared variable schema that locks value type and kind.
   *
   * Used by bits such as ``roborean.set_variable`` that assign a value to an
   * existing workspace variable without changing its declared type.
   */
  declaredVariableSchema?: Record<string, unknown>;

  /** Whether to show the workspace value kind selector. */
  showKindSelector?: boolean;
};

/**
 * Edit a workspace value using structured fields (without schema constraints).
 *
 * @param props - Value, handlers, and optional validation schema.
 * @returns Workspace value editor UI.
 */
export function WorkspaceValueEditor({
  value,
  onChange,
  validationSchema,
  declaredVariableSchema,
  showKindSelector = true,
}: WorkspaceValueEditorProps) {
  const boundToVariable = declaredVariableSchema !== undefined;
  const lockedValueType = boundToVariable
    ? valueTypeFromSchema(declaredVariableSchema)
    : valueTypeFromPublicLiteral(
        value.kind === "public_literal"
          ? value
          : defaultWorkspaceValueForKind("public_literal"),
        validationSchema,
      );

  // Keep public literals aligned with the declared variable type.
  useEffect(() => {
    if (!declaredVariableSchema) {
      return;
    }

    const bound = bindPublicLiteralToVariableSchema(
      value,
      declaredVariableSchema,
    );
    if (JSON.stringify(bound) !== JSON.stringify(value)) {
      onChange(bound);
    }
  }, [declaredVariableSchema, onChange, value]);

  if (boundToVariable) {
    const literal =
      value.kind === "public_literal"
        ? value
        : bindPublicLiteralToVariableSchema(value, declaredVariableSchema);

    return (
      <FormStack>
        <Typography variant="caption" color="text.secondary">
          Value type:{" "}
          {describedOptionLabel(VALUE_TYPE_OPTIONS, lockedValueType)}
        </Typography>
        <LiteralValueFields
          valueType={lockedValueType}
          literalValue={literal.value ?? null}
          validationSchema={declaredVariableSchema}
          valueLabel="Value"
          showValueType={false}
          onValueTypeChange={() => undefined}
          onLiteralChange={(literalValue) =>
            onChange(
              applyPublicLiteralValueType(
                { ...literal, value: literalValue },
                lockedValueType,
                declaredVariableSchema,
              ),
            )
          }
        />
      </FormStack>
    );
  }

  return (
    <FormStack>
      {showKindSelector ? (
        <FormTextField
          select
          size="small"
          label="Value kind"
          value={value.kind}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(
              defaultWorkspaceValueForKind(
                event.target.value as WorkspaceValue["kind"],
              ),
            )
          }
          SelectProps={{
            renderValue: (selected: unknown) =>
              describedOptionLabel(VALUE_KIND_OPTIONS, String(selected)),
          }}
        >
          {VALUE_KIND_OPTIONS.map((option) => (
            <DescribedMenuItem
              key={option.value}
              value={option.value}
              label={option.label}
              description={option.description}
            />
          ))}
        </FormTextField>
      ) : null}
      {value.kind === "public_literal" ? (
        <LiteralValueFields
          valueType={lockedValueType}
          literalValue={value.value ?? null}
          validationSchema={validationSchema}
          valueLabel="Value"
          onValueTypeChange={(nextType) =>
            onChange(
              applyPublicLiteralValueType(value, nextType, validationSchema),
            )
          }
          onLiteralChange={(literalValue) =>
            onChange({ ...value, value: literalValue })
          }
        />
      ) : null}
      {value.kind === "secret_ref" ? (
        <FormTextField
          size="small"
          label="Secret ref"
          value={value.ref}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange({ ...value, ref: event.target.value })
          }
        />
      ) : null}
      {value.kind === "eq_token" ? (
        <>
          <FormTextField
            size="small"
            label="Token"
            value={value.token}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, token: event.target.value })
            }
          />
          <FormTextField
            size="small"
            label="Domain"
            value={value.domain ?? ""}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const domain = event.target.value;
              const next = { ...value, domain };
              if (!domain.trim()) {
                delete next.domain;
              }
              onChange(next);
            }}
          />
        </>
      ) : null}
      {value.kind === "shape_token" ? (
        <FormTextField
          select
          size="small"
          label="Shape"
          value={value.shape}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange({
              ...value,
              shape: event.target.value as typeof value.shape,
            })
          }
        >
          {(["email", "phone", "iban", "uuid", "code"] as const).map(
            (shape) => (
              <DescribedMenuItem
                key={shape}
                value={shape}
                label={shape}
                description={`Shape token for ${shape} values.`}
              />
            ),
          )}
        </FormTextField>
      ) : null}
      {value.kind === "bucket" ? (
        <FormTextField
          size="small"
          label="Bucket"
          value={value.bucket}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange({ ...value, bucket: event.target.value })
          }
        />
      ) : null}
    </FormStack>
  );
}
