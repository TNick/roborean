import { useState, type ChangeEvent } from "react";
import type { Variable, WorkspaceValue } from "@roborean/spec";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { FormStack, FormTextField } from "@roborean/ui";

import {
  DescribedMenuItem,
  describedOptionLabel,
} from "./DescribedMenuItem.js";
import { ValueTypeEditor } from "./ValueTypeEditor.js";
import { defaultWorkspaceValueForKind } from "./workspaceValueDefaults.js";
import { WorkspaceValueEditor } from "./WorkspaceValueEditor.js";
import { EXPOSURE_OPTIONS, VALUE_KIND_OPTIONS } from "./variableOptions.js";

/**
 * Props for the workspace variable form.
 */
export type VariableFormProps = {
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
 * Structured editor for one workspace variable.
 *
 * @param props - Variable and change handler.
 * @returns Variable form UI.
 */
export function VariableForm({ variable, onChange }: VariableFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const defaultValue = variable.defaultValue;

  return (
    <FormStack>
      <FormTextField
        size="small"
        label="Key"
        value={variable.key}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...variable, key: event.target.value })
        }
      />
      <FormTextField
        select
        size="small"
        label="Exposure"
        value={variable.exposure}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({
            ...variable,
            exposure: event.target.value as Variable["exposure"],
          })
        }
        SelectProps={{
          renderValue: (selected) =>
            describedOptionLabel(EXPOSURE_OPTIONS, String(selected)),
        }}
      >
        {EXPOSURE_OPTIONS.map((option) => (
          <DescribedMenuItem
            key={option.value}
            value={option.value}
            label={option.label}
            description={option.description}
          />
        ))}
      </FormTextField>
      <FormTextField
        size="small"
        label="Description"
        multiline
        minRows={2}
        value={variable.description ?? ""}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({ ...variable, description: event.target.value })
        }
      />
      <FormTextField
        select
        size="small"
        label="Default value kind"
        value={defaultValue.kind}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange({
            ...variable,
            defaultValue: defaultWorkspaceValueForKind(
              event.target.value as WorkspaceValue["kind"],
            ),
          })
        }
        SelectProps={{
          renderValue: (selected) =>
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
      {defaultValue.kind === "public_literal" ? (
        <ValueTypeEditor variable={variable} onChange={onChange} />
      ) : (
        <WorkspaceValueEditor
          value={defaultValue}
          showKindSelector={false}
          onChange={(next) => onChange({ ...variable, defaultValue: next })}
        />
      )}
      <Accordion
        expanded={advancedOpen}
        onChange={(_event, expanded) => setAdvancedOpen(expanded)}
        disableGutters
        elevation={0}
        sx={{
          "&::before": { display: "none" },
          bgcolor: "transparent",
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Advanced (raw JSON)
        </AccordionSummary>
        <AccordionDetails>
          <FormStack>
            <FormTextField
              size="small"
              label="JSON Schema"
              multiline
              minRows={3}
              value={JSON.stringify(variable.schema, null, 2)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                try {
                  const schema = JSON.parse(event.target.value) as Record<
                    string,
                    unknown
                  >;
                  onChange({ ...variable, schema });
                } catch {
                  /* ignore invalid JSON while typing */
                }
              }}
            />
            <FormTextField
              size="small"
              label="Default value (full JSON)"
              multiline
              minRows={4}
              value={JSON.stringify(variable.defaultValue, null, 2)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                try {
                  const defaultValueParsed = JSON.parse(
                    event.target.value,
                  ) as WorkspaceValue;
                  onChange({ ...variable, defaultValue: defaultValueParsed });
                } catch {
                  /* ignore invalid JSON while typing */
                }
              }}
            />
          </FormStack>
        </AccordionDetails>
      </Accordion>
    </FormStack>
  );
}
