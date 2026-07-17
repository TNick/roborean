import { useMemo, useSyncExternalStore } from "react";
import type { Project } from "@roborean/spec";
import { createRoboreanClient } from "@roborean/api-types";
import {
  Button,
  DiagnosticList,
  List,
  ListItemButton,
  ListItemText,
  Panel,
  SplitPane,
  Stack,
  Typography,
} from "@roborean/ui";
import { scrubProjectForEditor } from "@roborean/validation";

import { createEditorStore, type EditorStore } from "./state/editorStore.js";

export type ProjectEditorProps = {
  project: Project;
  projectId?: string;
  client?: ReturnType<typeof createRoboreanClient>;
  apiBaseUrl?: string;
  onChange?: (project: Project) => void;
};

function useEditorStore(store: EditorStore) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

/** Main Roborean project editor surface. */
export function ProjectEditor({
  project,
  projectId,
  client,
  apiBaseUrl,
}: ProjectEditorProps) {
  const store = useMemo(
    () => createEditorStore(scrubProjectForEditor(project)),
    [project],
  );
  const state = useEditorStore(store);
  const api =
    client ??
    (apiBaseUrl ? createRoboreanClient({ baseUrl: apiBaseUrl }) : undefined);
  const selectedBit = state.project.bits.find(
    (bit) => bit.id === state.selectedBitId,
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={() => store.recomputeLocal()}>
          Dry-run
        </Button>
        {api && projectId ? (
          <Button
            variant="outlined"
            onClick={async () => {
              const run = await api.createRun(
                projectId,
                {},
                crypto.randomUUID(),
              );
              store.setServerRun(run);
            }}
          >
            Run on server
          </Button>
        ) : null}
      </Stack>
      <SplitPane
        left={
          <Panel title="Bits">
            <List dense>
              {state.project.bits.map((bit) => (
                <ListItemButton
                  key={bit.id}
                  selected={bit.id === state.selectedBitId}
                  onClick={() => store.selectBit(bit.id)}
                >
                  <ListItemText primary={bit.id} secondary={bit.type} />
                </ListItemButton>
              ))}
            </List>
          </Panel>
        }
        center={
          <Panel title="Bit detail">
            {selectedBit ? (
              <Stack spacing={1}>
                <Typography variant="body2">Type: {selectedBit.type}</Typography>
                <Typography variant="body2">
                  Effect: {selectedBit.effectClass}
                </Typography>
                <Typography component="pre" variant="body2">
                  {JSON.stringify(selectedBit.config, null, 2)}
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2">Select a bit</Typography>
            )}
          </Panel>
        }
        right={
          <Stack spacing={2}>
            <Panel title="Diagnostics">
              <DiagnosticList items={state.diagnostics} />
            </Panel>
            <Panel title="Dry-run">
              <Typography variant="body2" data-testid="dry-run-status">
                {state.localRun?.status ?? "not run"}
              </Typography>
            </Panel>
          </Stack>
        }
      />
    </Stack>
  );
}
