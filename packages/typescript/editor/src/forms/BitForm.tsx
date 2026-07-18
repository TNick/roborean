import type { ChangeEvent } from "react";
import type { Bit, DocumentDefinition, Variable } from "@roborean/spec";
import MenuItem from "@mui/material/MenuItem";
import { FormStack, FormTextField, Typography } from "@roborean/ui";

import { getBitManifest } from "../bitManifestRegistry.js";
import { documentDisplayTitle } from "../utils/documentDisplayTitle.js";
import { VariableKeyField } from "./VariableKeyField.js";
import {
  bindPublicLiteralToVariableSchema,
  normalizeWorkspaceValue,
} from "./workspaceValueDefaults.js";
import { WorkspaceValueEditor } from "./WorkspaceValueEditor.js";

/**
 * Props for manifest-backed bit configuration.
 */
export type BitFormProps = {
  /** Bit definition to edit. */
  bit: Bit;

  /** Workspace variables for config pickers. */
  variables: Variable[];

  /** Document definitions for documentId fields. */
  documents: DocumentDefinition[];

  /**
   * Called when the bit document changes.
   *
   * @param next - Updated bit.
   */
  onChange: (next: Bit) => void;
};

type JsonSchemaProperty = {
  type?: string;
  enum?: string[];
};

/**
 * Check whether a config field stores a workspace value document.
 *
 * @param name - Config property name.
 * @param schema - JSON Schema fragment for the property.
 * @returns True when the field should use the workspace value editor.
 */
function isWorkspaceValueConfigField(
  name: string,
  schema: JsonSchemaProperty,
): boolean {
  return name === "value" && schema.type === undefined;
}

/**
 * Update one config field on the bit.
 *
 * @param bit - Current bit.
 * @param key - Config property name.
 * @param value - New property value.
 * @returns Bit with merged config.
 */
function patchConfig(bit: Bit, key: string, value: unknown): Bit {
  return {
    ...bit,
    config: { ...bit.config, [key]: value },
  };
}

/**
 * Render one config field from a JSON Schema property definition.
 *
 * @param props - Field metadata and handlers.
 * @returns Config field control.
 */
function ConfigField(props: {
  name: string;
  schema: JsonSchemaProperty;
  value: unknown;
  variables: Variable[];
  documents: DocumentDefinition[];
  targetVariable?: Variable;
  onChange: (value: unknown) => void;
}) {
  const {
    name,
    schema,
    value,
    variables,
    documents,
    targetVariable,
    onChange,
  } = props;

  if (isWorkspaceValueConfigField(name, schema)) {
    if (!targetVariable) {
      return (
        <Typography variant="body2" color="text.secondary">
          Select a variable key to edit the value.
        </Typography>
      );
    }

    const workspaceValue = bindPublicLiteralToVariableSchema(
      normalizeWorkspaceValue(value),
      targetVariable.schema,
    );

    return (
      <WorkspaceValueEditor
        value={workspaceValue}
        declaredVariableSchema={targetVariable.schema}
        onChange={onChange}
      />
    );
  }

  if (name === "documentId" && documents.length > 0) {
    return (
      <FormTextField
        select
        size="small"
        label="Document"
        value={String(value ?? "")}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
      >
        {documents.map((document) => (
          <MenuItem key={document.id} value={document.id}>
            {documentDisplayTitle(document)}
          </MenuItem>
        ))}
      </FormTextField>
    );
  }

  if (name === "key" && variables.length > 0) {
    return (
      <VariableKeyField
        value={String(value ?? "")}
        options={variables.map((variable) => variable.key)}
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (schema.enum) {
    return (
      <FormTextField
        select
        size="small"
        label={name}
        value={String(value ?? schema.enum[0] ?? "")}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
      >
        {schema.enum.map((item) => (
          <MenuItem key={item} value={item}>
            {item}
          </MenuItem>
        ))}
      </FormTextField>
    );
  }

  if (schema.type === "array" || schema.type === "object") {
    return (
      <FormTextField
        size="small"
        label={name}
        multiline
        minRows={3}
        value={value === undefined ? "" : JSON.stringify(value, null, 2)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          try {
            onChange(JSON.parse(event.target.value));
          } catch {
            /* ignore invalid JSON while typing */
          }
        }}
      />
    );
  }

  if (schema.type === "number") {
    return (
      <FormTextField
        size="small"
        type="number"
        label={name}
        value={value === undefined ? "" : String(value)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(Number(event.target.value))
        }
      />
    );
  }

  return (
    <FormTextField
      size="small"
      label={name}
      value={value === undefined ? "" : String(value)}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(event.target.value)
      }
    />
  );
}

/**
 * Manifest-backed bit editor (config + activation rule).
 *
 * @param props - Bit, context lists, and change handler.
 * @returns Bit form UI.
 */
export function BitForm({ bit, variables, documents, onChange }: BitFormProps) {
  const manifest = getBitManifest(bit.type);
  const properties =
    (manifest?.configSchema.properties as
      Record<string, JsonSchemaProperty> | undefined) ?? {};
  const required = (manifest?.configSchema.required as string[]) ?? [];
  const targetVariableKey =
    typeof bit.config.key === "string" ? bit.config.key : "";
  const targetVariable = variables.find(
    (variable) => variable.key === targetVariableKey,
  );

  return (
    <FormStack>
      <FormTextField
        size="small"
        label="Label"
        value={bit.label ?? ""}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          // Keep the document minimal when the label is cleared.
          const label = event.target.value;
          const next: Bit = { ...bit, label };

          if (!label.trim()) {
            delete next.label;
          }

          onChange(next);
        }}
      />
      {Object.keys(properties).length > 0 ? (
        Object.entries(properties).map(([name, schema]) => (
          <ConfigField
            key={name}
            name={name}
            schema={schema}
            value={bit.config[name]}
            variables={variables}
            documents={documents}
            targetVariable={name === "value" ? targetVariable : undefined}
            onChange={(fieldValue) => {
              if (name === "key" && typeof fieldValue === "string") {
                const variable = variables.find(
                  (entry) => entry.key === fieldValue,
                );
                let nextBit = patchConfig(bit, name, fieldValue);
                if (variable && bit.type === "roborean.set_variable") {
                  nextBit = patchConfig(
                    nextBit,
                    "value",
                    bindPublicLiteralToVariableSchema(
                      normalizeWorkspaceValue(bit.config.value),
                      variable.schema,
                    ),
                  );
                }
                onChange(nextBit);
                return;
              }

              onChange(patchConfig(bit, name, fieldValue));
            }}
          />
        ))
      ) : (
        <FormTextField
          size="small"
          label="Config JSON"
          multiline
          minRows={6}
          value={JSON.stringify(bit.config, null, 2)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            try {
              const config = JSON.parse(event.target.value) as Record<
                string,
                unknown
              >;
              onChange({ ...bit, config });
            } catch {
              /* ignore invalid JSON while typing */
            }
          }}
        />
      )}
      {required.length > 0 ? (
        <Typography variant="caption" color="text.secondary">
          Required: {required.join(", ")}
        </Typography>
      ) : null}
    </FormStack>
  );
}
