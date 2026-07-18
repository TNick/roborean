import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ProjectSummary, TemplateLibraryEntry } from "@roborean/api-types";
import { AppToolbar, RoboreanToolbarEnd, TemplatesLibrary } from "@roborean/ui";
import { createClient } from "../api/createClient.js";
import { IS_GOOGLE_MODE } from "../config.js";
import {
  importDocumentTemplate,
  importRecipe,
  useProjectStarter,
} from "../lib/templateLibraryActions.js";
import { useWorkspace } from "../storage/workspaceContext.js";

/**
 * Global templates library page with import and starter actions.
 *
 * @returns Templates library page element.
 */
export function TemplatesLibraryPage() {
  const navigate = useNavigate();
  const { isGoogleMode } = useWorkspace();

  // Catalog rows loaded from the API.
  const [entries, setEntries] = useState<TemplateLibraryEntry[]>([]);

  // True while the catalog list request is in flight.
  const [loading, setLoading] = useState(true);

  // Last catalog or action error message.
  const [error, setError] = useState<string | null>(null);

  // Entry ids currently running import/create actions.
  const [busyIds, setBusyIds] = useState<string[]>([]);

  // Whether the project picker dialog is open.
  const [pickerOpen, setPickerOpen] = useState(false);

  // Loaded project summaries for the picker dialog.
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  // Pending import action waiting for a project selection.
  const [pendingAction, setPendingAction] = useState<
    | { kind: "document"; entry: TemplateLibraryEntry }
    | { kind: "recipe"; entry: TemplateLibraryEntry }
    | null
  >(null);

  /**
   * Load the global catalog from the API.
   *
   * @returns Promise that settles when entries are stored.
   */
  const loadCatalog = useCallback(async () => {
    if (IS_GOOGLE_MODE || isGoogleMode) {
      setEntries([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rows = await createClient().listTemplateLibrary();
      setEntries(rows);
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [isGoogleMode]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  /**
   * Mark one entry id as busy for the duration of an action.
   *
   * @param entryId - Catalog entry id.
   * @param action - Async work to run while busy.
   * @returns Promise returned by the action callback.
   */
  async function withBusy<T>(
    entryId: string,
    action: () => Promise<T>,
  ): Promise<T> {
    setBusyIds((current) => [...current, entryId]);
    setError(null);

    try {
      return await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      throw err;
    } finally {
      setBusyIds((current) => current.filter((id) => id !== entryId));
    }
  }

  /**
   * Open the project picker for a document or recipe import.
   *
   * @param kind - Import kind requiring an existing project target.
   * @param entry - Selected catalog entry.
   * @returns Promise that settles when projects are loaded.
   */
  async function openProjectPicker(
    kind: "document" | "recipe",
    entry: TemplateLibraryEntry,
  ): Promise<void> {
    setPendingAction({ kind, entry });
    setPickerOpen(true);
    setError(null);

    try {
      const rows = await createClient().listProjects();
      setProjects(rows);
    } catch (err) {
      setProjects([]);
      setError(err instanceof Error ? err.message : "Failed to list projects");
    }
  }

  /**
   * Run the pending import against the chosen project.
   *
   * @param projectId - Stored project id selected in the dialog.
   * @returns Promise that settles when navigation completes.
   */
  async function completeImport(projectId: string): Promise<void> {
    if (!pendingAction) {
      return;
    }

    const { entry } = pendingAction;
    setPickerOpen(false);

    await withBusy(entry.id, async () => {
      const client = createClient();

      if (pendingAction.kind === "document") {
        await importDocumentTemplate(client, projectId, entry);
      } else {
        await importRecipe(client, projectId, entry);
      }

      navigate(`/projects/${projectId}`);
    });

    setPendingAction(null);
  }

  return (
    <>
      <AppToolbar endActions={<RoboreanToolbarEnd />}>
        <Typography variant="h6" component="h1">
          Templates library
        </Typography>
      </AppToolbar>
      <Stack sx={{ p: 3 }} spacing={2}>
        {isGoogleMode ? (
          <Alert severity="info">
            The templates library requires the optional FastAPI backend. In
            Google Workspace mode, create blank projects and edit them locally.
          </Alert>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TemplatesLibrary
          entries={entries}
          loading={loading}
          busyIds={busyIds}
          onImportDocument={(entry) =>
            void openProjectPicker("document", entry)
          }
          onImportRecipe={(entry) => void openProjectPicker("recipe", entry)}
          onUseProjectStarter={(entry) => {
            void withBusy(entry.id, async () => {
              const projectId = await useProjectStarter(createClient(), entry);
              navigate(`/projects/${projectId}`);
            });
          }}
        />
      </Stack>
      <Dialog
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPendingAction(null);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Choose a project</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Import replaces the stored project body. Unsaved editor changes in
            another tab are not merged.
          </Typography>
          <List>
            {projects.map((project) => (
              <ListItemButton
                key={project.id}
                onClick={() => void completeImport(project.id)}
              >
                <ListItemText primary={project.name} secondary={project.id} />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPickerOpen(false);
              setPendingAction(null);
            }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
