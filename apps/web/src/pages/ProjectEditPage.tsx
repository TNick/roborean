import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Project } from "@roborean/spec";
import { ProjectEditor } from "@roborean/editor";
import {
  AppToolbar,
  AppToolbarTitle,
  RoboreanResponsiveToolbarEnd,
} from "@roborean/ui";
import { ToolbarNavButton } from "../components/ToolbarNavButton.js";
import { PageShell } from "../components/PageShell.js";
import {
  API_BASE_URL,
  isStorageSource,
  type StorageSource,
} from "../config.js";
import { useWorkspace } from "../storage/workspaceContext.js";
import { createGoogleDocTemplateHostActions } from "../storage/googleDocTemplates.js";

/**
 * Loads one project and hosts the editor with delete support.
 *
 * @returns Project edit page element.
 */
export function ProjectEditPage() {
  const navigate = useNavigate();
  const { source: sourceParam = "", id = "" } = useParams();
  const { clientFor, apis, binding, getAccessToken } = useWorkspace();

  // Parsed storage source from the route, when valid.
  const source: StorageSource | null = isStorageSource(sourceParam)
    ? sourceParam
    : null;

  // Client for the project’s backend.
  const client = source ? clientFor(source) : null;

  // Loaded project document, or null while loading / on failure.
  const [project, setProject] = useState<Project | null>(null);

  // True while a delete request is in flight.
  const [deleting, setDeleting] = useState(false);

  // Whether the delete confirmation dialog is open.
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Last user-visible error from load or delete.
  const [error, setError] = useState<string | null>(null);

  // True once the initial load attempt has finished.
  const [loaded, setLoaded] = useState(false);

  // Shared chrome so loading / error do not flash a blank shell.
  const toolbarStart = <ToolbarNavButton kind="back" to="/projects" />;
  const toolbarEnd = <RoboreanResponsiveToolbarEnd />;

  useEffect(() => {
    let cancelled = false;

    setLoaded(false);
    setError(null);

    if (!source) {
      setProject(null);
      setLoaded(true);
      setError("Unknown storage source");
      return;
    }

    if (!client) {
      setProject(null);
      setLoaded(true);
      setError(
        source === "google"
          ? "Google Drive is not connected"
          : "API storage is unavailable",
      );
      return;
    }

    client
      .getProject(id)
      .then((detail) => {
        if (!cancelled) {
          setProject(detail.project as unknown as Project);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProject(null);
          setError(
            err instanceof Error ? err.message : "Failed to load project",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, source, client]);

  /**
   * Delete the current project after the confirmation dialog.
   *
   * @returns Promise that settles when delete finishes.
   */
  async function performDeleteCurrentProject(): Promise<void> {
    if (!project || !client) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await client.deleteProject(id);
      setDeleteConfirmOpen(false);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }

  if (!loaded) {
    return (
      <PageShell>
        <AppToolbar startActions={toolbarStart} endActions={toolbarEnd}>
          <AppToolbarTitle>Loading…</AppToolbarTitle>
        </AppToolbar>
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress />
        </Stack>
      </PageShell>
    );
  }

  if (!project) {
    return (
      <PageShell>
        <AppToolbar startActions={toolbarStart} endActions={toolbarEnd}>
          <AppToolbarTitle>Project not found</AppToolbarTitle>
        </AppToolbar>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Typography>Project not found.</Typography>
        <Button onClick={() => navigate("/projects")}>Back to projects</Button>
      </PageShell>
    );
  }

  // Google-backed projects run in the browser; API projects use the server.
  const isGoogleSource = source === "google";

  const googleDocTemplate =
    isGoogleSource && apis && binding && getAccessToken
      ? createGoogleDocTemplateHostActions({
          apis,
          binding,
          getAccessToken,
          projectId: id,
        })
      : undefined;

  return (
    <PageShell>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <ProjectEditor
        project={project}
        projectId={id}
        client={client ?? undefined}
        apiBaseUrl={isGoogleSource ? undefined : API_BASE_URL}
        runLabel={isGoogleSource ? "Run in browser" : "Run on server"}
        deleting={deleting}
        onChange={setProject}
        onDelete={() => setDeleteConfirmOpen(true)}
        toolbarStart={toolbarStart}
        toolbarEnd={toolbarEnd}
        googleDocTemplate={googleDocTemplate}
      />
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteConfirmOpen(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete project</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Delete project &quot;{project.name}&quot; ({project.id})? This
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            disabled={deleting}
            onClick={() => setDeleteConfirmOpen(false)}
          >
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            onClick={() => void performDeleteCurrentProject()}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </PageShell>
  );
}
