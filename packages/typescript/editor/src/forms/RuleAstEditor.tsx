import type { ChangeEvent } from "react";
import type { JsonScalar, RuleAst } from "@roborean/spec";
import MenuItem from "@mui/material/MenuItem";
import { FormStack, FormTextField } from "@roborean/ui";

import { VariableKeyField } from "./VariableKeyField.js";

/**
 * Props for the rule AST node editor.
 */
export type RuleAstEditorProps = {
  /** Current rule expression node. */
  value: RuleAst;

  /**
   * Called when the user edits the rule.
   *
   * @param next - Updated rule value.
   */
  onChange: (next: RuleAst) => void;

  /** Optional workspace variable keys for filterable pickers. */
  variableKeys?: string[];
};

const RULE_OPS: RuleAst["op"][] = [
  "and",
  "or",
  "not",
  "eq",
  "ne",
  "lt",
  "le",
  "gt",
  "ge",
  "has",
  "const",
  "var",
];

/**
 * Default starter rule when opening the condition editor with no condition.
 */
export const DEFAULT_BIT_CONDITION: RuleAst = {
  op: "const",
  args: [true],
};

/**
 * Parse a scalar literal from a text field.
 *
 * @param raw - User input.
 * @returns Parsed JSON scalar or the original string.
 */
function parseScalar(raw: string): JsonScalar | string {
  const trimmed = raw.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null") {
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Edit a single `RuleAst` node (non-recursive shell).
 *
 * @param props - Node value and change handler.
 * @returns Rule node fields.
 */
export function RuleAstEditor({
  value,
  onChange,
  variableKeys = [],
}: RuleAstEditorProps) {
  const isLogical =
    value.op === "and" || value.op === "or" || value.op === "not";
  const isCompare =
    value.op === "eq" ||
    value.op === "ne" ||
    value.op === "lt" ||
    value.op === "le" ||
    value.op === "gt" ||
    value.op === "ge";
  const isVar = value.op === "var";
  const isConst = value.op === "const";
  const isHas = value.op === "has";

  return (
    <FormStack>
      <FormTextField
        select
        size="small"
        label="Operator"
        value={value.op}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({
            op: event.target.value as RuleAst["op"],
            args: [],
          })
        }
      >
        {RULE_OPS.map((op) => (
          <MenuItem key={op} value={op}>
            {op}
          </MenuItem>
        ))}
      </FormTextField>
      {isVar ? (
        variableKeys.length > 0 ? (
          <VariableKeyField
            value={String(value.args[0] ?? "")}
            options={variableKeys}
            freeSolo
            onChange={(next) => onChange({ op: "var", args: [next] })}
          />
        ) : (
          <FormTextField
            size="small"
            label="Variable key"
            value={String(value.args[0] ?? "")}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({ op: "var", args: [event.target.value] })
            }
          />
        )
      ) : null}
      {isConst ? (
        <FormTextField
          size="small"
          label="Constant"
          value={String(value.args[0] ?? "")}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange({
              op: "const",
              args: [parseScalar(event.target.value)],
            })
          }
        />
      ) : null}
      {isHas ? (
        variableKeys.length > 0 ? (
          <VariableKeyField
            label="Key"
            value={String(value.args[0] ?? "")}
            options={variableKeys}
            freeSolo
            onChange={(next) =>
              onChange({
                op: "has",
                args: [next, value.args[1] ?? ""],
              })
            }
          />
        ) : (
          <FormTextField
            size="small"
            label="Key"
            value={String(value.args[0] ?? "")}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({
                op: "has",
                args: [event.target.value, value.args[1] ?? ""],
              })
            }
          />
        )
      ) : null}
      {isCompare ? (
        <>
          {variableKeys.length > 0 ? (
            <VariableKeyField
              label="Left (var key or JSON)"
              value={String(value.args[0] ?? "")}
              options={variableKeys}
              freeSolo
              onChange={(next) =>
                onChange({
                  op: value.op,
                  args: [next, value.args[1] ?? ""],
                })
              }
            />
          ) : (
            <FormTextField
              size="small"
              label="Left (var key or JSON)"
              value={String(value.args[0] ?? "")}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                onChange({
                  op: value.op,
                  args: [event.target.value, value.args[1] ?? ""],
                })
              }
            />
          )}
          <FormTextField
            size="small"
            label="Right"
            value={String(value.args[1] ?? "")}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange({
                op: value.op,
                args: [value.args[0] ?? "", parseScalar(event.target.value)],
              })
            }
          />
        </>
      ) : null}
      {isLogical ? (
        <FormTextField
          size="small"
          label="Child rules (JSON array of RuleAst)"
          multiline
          minRows={3}
          value={JSON.stringify(value.args, null, 2)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            try {
              const parsed = JSON.parse(event.target.value) as RuleAst[];
              onChange({ op: value.op, args: parsed });
            } catch {
              /* ignore invalid JSON while typing */
            }
          }}
        />
      ) : null}
    </FormStack>
  );
}
