import { useEffect, useState } from "react";
import type {
  RunDetail,
  RunSummary,
  createRoboreanClient,
} from "@roborean/api-types";
import {
  Button,
  List,
  ListItemButton,
  ListItemText,
  ScrollablePanelSection,
  Stack,
  Typography,
} from "@roborean/ui";

/**
 * Props for the run history panel.
 */
export type RunHistoryPanelProps = {
  /** Stored project id for listing runs. */
  projectId: string;

  /** API client used to list and load runs. */
  client: Pick<ReturnType<typeof createRoboreanClient>, "listRuns" | "getRun">;

  /** Currently loaded server run, if any. */
  selectedRunId: string | null;

  /**
   * Called when the user selects a run row.
   *
   * @param run - Full run detail from the API.
   */
  onSelectRun: (run: RunDetail) => void;
};

/**
 * Lists recent server runs for the open project.
 *
 * @param props - Project id, client, and selection handlers.
 * @returns Run history UI.
 */
export function RunHistoryPanel({
  projectId,
  client,
  selectedRunId,
  onSelectRun,
}: RunHistoryPanelProps) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Refresh the run list from the API.
   */
  async function refresh(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const items = await client.listRuns(projectId);
      setRuns(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [projectId, client]);

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Server runs
        </Typography>
        <Button
          variant="outlined"
          disabled={loading}
          onClick={() => void refresh()}
        >
          Refresh
        </Button>
      </Stack>
      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
      <ScrollablePanelSection>
        <List dense>
          {runs.length === 0 ? (
            <Typography variant="body2">No runs yet</Typography>
          ) : (
            runs.map((run) => (
              <ListItemButton
                key={run.runId}
                selected={run.runId === selectedRunId}
                onClick={() => {
                  void client.getRun(run.runId).then(onSelectRun);
                }}
              >
                <ListItemText
                  primary={run.runId.slice(0, 8)}
                  secondary={`${run.status} · ${run.createdAt}`}
                />
              </ListItemButton>
            ))
          )}
        </List>
      </ScrollablePanelSection>
    </Stack>
  );
}
