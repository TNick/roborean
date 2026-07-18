import { useEffect, useState } from "react";
import type { Project } from "@roborean/spec";
import {
  Button,
  List,
  ListItemButton,
  ListItemText,
  Panel,
  ScrollablePanelSection,
  Stack,
} from "@roborean/ui";

import { describedOptionLabel } from "../forms/DescribedMenuItem.js";
import { EXPOSURE_OPTIONS } from "../forms/variableOptions.js";
import { filterVariables } from "../listFilters.js";

/**
 * Props for the workspace variable list panel.
 */
export type WorkspacePanelProps = {
  /** Project whose workspace variables are listed. */
  project: Project;

  /** Currently selected variable key, if any. */
  selectedKey: string | null;

  /**
   * Called when the user selects a variable row.
   *
   * @param key - Selected workspace variable key.
   */
  onSelectKey: (key: string) => void;

  /** Add a new workspace variable. */
  onAdd: () => void;

  /** Remove the selected variable, when a key is selected. */
  onRemove: () => void;
};

/**
 * Lists workspace variables for quick inspection.
 *
 * @param props - Panel inputs and selection handler.
 * @returns Workspace variable list UI.
 */
export function WorkspacePanel({
  project,
  selectedKey,
  onSelectKey,
  onAdd,
  onRemove,
}: WorkspacePanelProps) {
  // Local search query for filtering the variable list.
  const [searchQuery, setSearchQuery] = useState("");
  const hasVariables = project.workspace.variables.length > 0;

  useEffect(() => {
    if (!hasVariables && searchQuery) {
      setSearchQuery("");
    }
  }, [hasVariables, searchQuery]);

  const variables = filterVariables(project.workspace.variables, searchQuery);

  return (
    <Panel
      title="Variables"
      {...(hasVariables
        ? { searchQuery, onSearchQueryChange: setSearchQuery }
        : {})}
    >
      <Stack spacing={1}>
        <ScrollablePanelSection>
          <List dense>
            {variables.map((variable) => (
              <ListItemButton
                key={variable.key}
                selected={variable.key === selectedKey}
                onClick={() => onSelectKey(variable.key)}
              >
                <ListItemText
                  primary={variable.key}
                  secondary={describedOptionLabel(
                    EXPOSURE_OPTIONS,
                    variable.exposure,
                  )}
                />
              </ListItemButton>
            ))}
          </List>
        </ScrollablePanelSection>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={onAdd}>
            Add
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={!selectedKey}
            onClick={onRemove}
          >
            Remove
          </Button>
        </Stack>
      </Stack>
    </Panel>
  );
}
