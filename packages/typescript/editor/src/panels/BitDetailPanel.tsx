import { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import type {
  Bit,
  DocumentDefinition,
  RuleAst,
  Variable,
} from "@roborean/spec";
import { Button, FormStack } from "@roborean/ui";

import { BitForm } from "../forms/BitForm.js";
import {
  DEFAULT_BIT_CONDITION,
  RuleAstEditor,
} from "../forms/RuleAstEditor.js";
import { getBitManifest } from "../bitManifestRegistry.js";
import { bitTypeDisplayName } from "../utils/bitTypeDisplayName.js";

/**
 * Whether a bit has an activation condition (not unconditional).
 *
 * @param when - Bit activation value.
 * @returns True when a rule expression is set.
 */
function hasCondition(when: Bit["when"]): when is RuleAst {
  return when !== true;
}

/**
 * Props for the bit detail panel.
 */
export type BitDetailPanelProps = {
  /** Selected bit definition, if any. */
  bit: Bit | null;

  /** Bit index within the ordered project list. */
  bitIndex: number;

  /** Total number of bits in the project. */
  bitCount: number;

  /** Workspace variables for config pickers. */
  variables: Variable[];

  /** Document definitions for documentId fields. */
  documents: DocumentDefinition[];

  /**
   * Move the selected bit up or down in execution order.
   *
   * @param direction - `-1` for up, `1` for down.
   */
  onMove: (direction: -1 | 1) => void;

  /**
   * Called when the user edits the bit.
   *
   * @param next - Updated bit definition.
   */
  onChange: (next: Bit) => void;
};

/**
 * Bit metadata, reorder controls, and manifest-backed config form.
 *
 * @param props - Bit selection, context, and handlers.
 * @returns Bit detail UI.
 */
export function BitDetailPanel({
  bit,
  bitIndex,
  bitCount,
  variables,
  documents,
  onMove,
  onChange,
}: BitDetailPanelProps) {
  // Which surface is shown under the header row.
  const [view, setView] = useState<"detail" | "condition">("detail");

  // Draft rule while editing conditions (applied only via Set condition(s)).
  const [draftWhen, setDraftWhen] = useState<RuleAst>(DEFAULT_BIT_CONDITION);

  // Reset the condition editor when the selected bit changes.
  useEffect(() => {
    setView("detail");
    setDraftWhen(
      bit && hasCondition(bit.when) ? bit.when : DEFAULT_BIT_CONDITION,
    );
  }, [bit?.id]);

  if (!bit) {
    return <Typography variant="body2">Select a bit</Typography>;
  }

  // Narrowed non-null bit for nested handlers.
  const currentBit = bit;

  // Disable reorder actions at the first and last execution slots.
  const canMoveUp = bitIndex > 0;
  const canMoveDown = bitIndex >= 0 && bitIndex < bitCount - 1;

  // Manifest presence drives the optional “no manifest” hint.
  const manifest = getBitManifest(currentBit.type);

  // Condition presence drives the toolbar button appearance.
  const conditionSet = hasCondition(currentBit.when);

  /**
   * Open the condition editor with a draft copied from the bit.
   */
  function openConditionEditor(): void {
    setDraftWhen(
      hasCondition(currentBit.when) ? currentBit.when : DEFAULT_BIT_CONDITION,
    );
    setView("condition");
  }

  /**
   * Apply the draft rule and return to the detail view.
   */
  function setCondition(): void {
    onChange({ ...currentBit, when: draftWhen });
    setView("detail");
  }

  /**
   * Clear activation to unconditional and return to the detail view.
   */
  function removeCondition(): void {
    onChange({ ...currentBit, when: true });
    setDraftWhen(DEFAULT_BIT_CONDITION);
    setView("detail");
  }

  return (
    <FormStack>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flexGrow: 1 }}
          noWrap
        >
          Type: {bitTypeDisplayName(currentBit.type, manifest)}
          {manifest ? "" : " (no manifest — use raw JSON below)"}
        </Typography>
        <Tooltip
          title={
            conditionSet
              ? "Edit activation condition"
              : "Add activation condition"
          }
        >
          <IconButton
            aria-label={
              conditionSet
                ? "Edit activation condition"
                : "Add activation condition"
            }
            color={conditionSet ? "primary" : "default"}
            onClick={() => {
              if (view === "condition") {
                setView("detail");
                return;
              }
              openConditionEditor();
            }}
          >
            {conditionSet ? (
              <FilterAltIcon fontSize="small" />
            ) : (
              <FilterAltOffIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="Move bit earlier in execution order">
          <span>
            <IconButton
              aria-label="Move bit earlier in execution order"
              disabled={!canMoveUp}
              onClick={() => onMove(-1)}
            >
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move bit later in execution order">
          <span>
            <IconButton
              aria-label="Move bit later in execution order"
              disabled={!canMoveDown}
              onClick={() => onMove(1)}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {view === "condition" ? (
        <FormStack>
          <Typography variant="subtitle2">Activation condition</Typography>
          <RuleAstEditor
            value={draftWhen}
            onChange={setDraftWhen}
            variableKeys={variables.map((variable) => variable.key)}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button color="error" variant="outlined" onClick={removeCondition}>
              Remove condition
            </Button>
            <Button variant="contained" onClick={setCondition}>
              Set condition(s)
            </Button>
          </Stack>
        </FormStack>
      ) : (
        <BitForm
          bit={currentBit}
          variables={variables}
          documents={documents}
          onChange={onChange}
        />
      )}
    </FormStack>
  );
}
