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
import { listGoogleTemplateLibrary } from "@roborean/google-workspace";
import {
  AppToolbar,
  AppToolbarTitle,
  coerceTemplateLibraryEntries,
  RoboreanResponsiveToolbarEnd,
  TemplatesLibrary,
} from "@roborean/ui";
import { ToolbarNavButton } from "../components/ToolbarNavButton.js";
import { PageShell } from "../components/PageShell.js";
import { IS_GOOGLE_ONLY, projectPath } from "../config.js";
import {
  importDocumentTemplate,
  importRecipe,
  useProjectStarter,
} from "../lib/templateLibraryActions.js";
import { useWorkspace } from "../storage/workspaceContext.js";
import type { TemplateLibraryClient } from "../lib/templateLibraryActions.js";

/**
 * Global templates library page with import and starter actions.
 *
 * @returns Templates library page element.
 */
export function TemplatesLibraryPage() {
  const navigate = useNavigate();
  const { isApiAvailable, client, googleClient } = useWorkspace();
  const storageSource = isApiAvailable ? "api" : "google";
  const actionClient = (
    isApiAvailable ? client : googleClient
  ) as TemplateLibraryClient | null;

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
   * Load the global catalog from the API or bundled Google Docs library.
   *
   * @returns Promise that settles when entries are stored.
   */
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (IS_GOOGLE_ONLY) {
        setEntries(coerceTemplateLibraryEntries(listGoogleTemplateLibrary()));
        return;
      }

      if (!client) {
        setEntries([]);
        return;
      }

      const rows = await client.listTemplateLibrary();
      setEntries(coerceTemplateLibraryEntries(rows));
    } catch (err) {
      setEntries([]);
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [client]);

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
      if (!actionClient) throw new Error("Storage is not connected");
      const rows = await actionClient.listProjects();
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
      if (!actionClient) throw new Error("Storage is not connected");
      const client = actionClient;

      if (pendingAction.kind === "document") {
        await importDocumentTemplate(client, projectId, entry);
      } else {
        await importRecipe(client, projectId, entry);
      }

      navigate(projectPath(storageSource, projectId));
    });

    setPendingAction(null);
  }

  return (
    <PageShell>
      <AppToolbar
        startActions={<ToolbarNavButton kind="home" to="/" />}
        endActions={<RoboreanResponsiveToolbarEnd />}
      >
        <AppToolbarTitle>Templates library</AppToolbarTitle>
      </AppToolbar>
      <Stack spacing={2}>
        {!isApiAvailable ? (
          <Alert severity="info">
            Templates are copied into your Google Drive when imported. Connect a
            Drive folder from the home page before using starters or imports.
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
              if (!actionClient) throw new Error("Storage is not connected");
              const projectId = await useProjectStarter(actionClient, entry);
              navigate(projectPath(storageSource, projectId));
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
    </PageShell>
  );
}
