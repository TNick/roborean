import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
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
  const [entries, setEntries] = useState([]);
  // True while the catalog list request is in flight.
  const [loading, setLoading] = useState(true);
  // Last catalog or action error message.
  const [error, setError] = useState(null);
  // Entry ids currently running import/create actions.
  const [busyIds, setBusyIds] = useState([]);
  // Whether the project picker dialog is open.
  const [pickerOpen, setPickerOpen] = useState(false);
  // Loaded project summaries for the picker dialog.
  const [projects, setProjects] = useState([]);
  // Pending import action waiting for a project selection.
  const [pendingAction, setPendingAction] = useState(null);
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
  async function withBusy(entryId, action) {
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
  async function openProjectPicker(kind, entry) {
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
  async function completeImport(projectId) {
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
  return _jsxs(_Fragment, {
    children: [
      _jsx(AppToolbar, {
        endActions: _jsx(RoboreanToolbarEnd, {}),
        children: _jsx(Typography, {
          variant: "h6",
          component: "h1",
          children: "Templates library",
        }),
      }),
      _jsxs(Stack, {
        sx: { p: 3 },
        spacing: 2,
        children: [
          isGoogleMode
            ? _jsx(Alert, {
                severity: "info",
                children:
                  "The templates library requires the optional FastAPI backend. In Google Workspace mode, create blank projects and edit them locally.",
              })
            : null,
          error ? _jsx(Alert, { severity: "error", children: error }) : null,
          _jsx(TemplatesLibrary, {
            entries: entries,
            loading: loading,
            busyIds: busyIds,
            onImportDocument: (entry) =>
              void openProjectPicker("document", entry),
            onImportRecipe: (entry) => void openProjectPicker("recipe", entry),
            onUseProjectStarter: (entry) => {
              void withBusy(entry.id, async () => {
                const projectId = await useProjectStarter(
                  createClient(),
                  entry,
                );
                navigate(`/projects/${projectId}`);
              });
            },
          }),
        ],
      }),
      _jsxs(Dialog, {
        open: pickerOpen,
        onClose: () => {
          setPickerOpen(false);
          setPendingAction(null);
        },
        fullWidth: true,
        maxWidth: "sm",
        children: [
          _jsx(DialogTitle, { children: "Choose a project" }),
          _jsxs(DialogContent, {
            children: [
              _jsx(Typography, {
                variant: "body2",
                color: "text.secondary",
                sx: { mb: 2 },
                children:
                  "Import replaces the stored project body. Unsaved editor changes in another tab are not merged.",
              }),
              _jsx(List, {
                children: projects.map((project) =>
                  _jsx(
                    ListItemButton,
                    {
                      onClick: () => void completeImport(project.id),
                      children: _jsx(ListItemText, {
                        primary: project.name,
                        secondary: project.id,
                      }),
                    },
                    project.id,
                  ),
                ),
              }),
            ],
          }),
          _jsx(DialogActions, {
            children: _jsx(Button, {
              onClick: () => {
                setPickerOpen(false);
                setPendingAction(null);
              },
              children: "Cancel",
            }),
          }),
        ],
      }),
    ],
  });
}
