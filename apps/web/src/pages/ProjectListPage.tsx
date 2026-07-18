import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Project } from "@roborean/spec";
import type { ProjectSummary } from "@roborean/api-types";
import AddIcon from "@mui/icons-material/Add";
import CloudIcon from "@mui/icons-material/Cloud";
import {
  AppToolbar,
  AppToolbarTitle,
  FormTextField,
  RoboreanResponsiveToolbarEnd,
  ToolbarActionButton,
  useCompactToolbarLayout,
  type ToolbarOverflowMenuItem,
} from "@roborean/ui";
import { ToolbarNavButton } from "../components/ToolbarNavButton.js";
import { PageShell } from "../components/PageShell.js";
import { projectPath, type StorageSource } from "../config.js";
import { ConnectDriveDialog } from "../storage/ConnectDriveDialog.js";
import { useWorkspace } from "../storage/workspaceContext.js";

/**
 * Project summary tagged with the backend that owns it.
 */
type ListedProject = ProjectSummary & {
  /**
   * Backend that stores this project.
   */
  source: StorageSource;
};

/**
 * Human-readable label for a storage source.
 *
 * @param source - Backend identifier.
 * @returns Short label for list secondary text.
 */
function sourceLabel(source: StorageSource): string {
  return source === "google" ? "Google Drive" : "API";
}

/**
 * Build a stable project id from a display name.
 *
 * @param name - Human-readable project name.
 * @returns Dot-separated id with a short random suffix.
 */
function projectIdFromName(name: string): string {
  // Keep letters and digits; collapse everything else to dots.
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");

  // Prefer a readable slug; fall back when the name is empty.
  const base = slug || "project";

  return `${base}.${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Build a minimal empty project document for create.
 *
 * @param id - Stable project identifier.
 * @param name - Human-readable project name.
 * @param description - Optional project description.
 * @returns A schema-valid empty project.
 */
function buildBlankProject(
  id: string,
  name: string,
  description: string,
): Project {
  // Only include description when the user typed one.
  const project: Project = {
    schemaVersion: "1.0.0",
    id,
    name,
    pluginRequirements: [],
    workspace: { variables: [] },
    bits: [],
    documents: [],
    templates: [],
    metadata: {},
  };

  if (description.trim()) {
    project.description = description.trim();
  }

  return project;
}

/**
 * Lists stored projects and supports create / delete.
 *
 * When both FastAPI and Google Drive are available, lists projects from both.
 *
 * @returns Project list page element.
 */
export function ProjectListPage() {
  const navigate = useNavigate();
  const {
    apiClient,
    googleClient,
    isApiAvailable,
    isGoogleAvailable,
    binding,
  } = useWorkspace();

  // Loaded project summaries from all available storage clients.
  const [projects, setProjects] = useState<ListedProject[]>([]);

  // True while a blank project create request is in flight.
  const [creating, setCreating] = useState(false);

  // Project pending deletion in the confirmation dialog.
  const [deleteTarget, setDeleteTarget] = useState<ListedProject | null>(null);

  // List row key for a delete request currently in flight.
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  // Whether the new-project dialog is open.
  const [createOpen, setCreateOpen] = useState(false);

  // Whether the optional Drive connect dialog is open.
  const [connectOpen, setConnectOpen] = useState(false);

  // Draft fields for the new-project dialog.
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Target backend for create when more than one is available.
  const [createSource, setCreateSource] = useState<StorageSource>(
    isApiAvailable ? "api" : "google",
  );

  // Last user-visible error from create / delete / list refresh.
  const [error, setError] = useState<string | null>(null);

  // Create targets that currently have a live client.
  const createTargets: StorageSource[] = [];
  if (apiClient) {
    createTargets.push("api");
  }
  if (googleClient) {
    createTargets.push("google");
  }

  /**
   * Reload the project list from every available backend.
   *
   * @returns Promise that settles when the list is updated.
   */
  async function refreshProjects(): Promise<void> {
    // Collect list results from API and Google independently.
    const settled = await Promise.allSettled([
      apiClient
        ? apiClient.listProjects().then((rows) =>
            rows.map((row): ListedProject => ({
              ...row,
              source: "api",
            })),
          )
        : Promise.resolve([] as ListedProject[]),
      googleClient
        ? googleClient.listProjects().then((rows) =>
            rows.map((row): ListedProject => ({
              ...row,
              source: "google",
            })),
          )
        : Promise.resolve([] as ListedProject[]),
    ]);

    // Flatten successful lists; surface the first failure if both fail.
    const rows: ListedProject[] = [];
    const errors: string[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        rows.push(...result.value);
      } else {
        errors.push(
          result.reason instanceof Error
            ? result.reason.message
            : "Failed to list projects",
        );
      }
    }

    setProjects(rows);
    if (rows.length === 0 && errors.length > 0) {
      setError(errors[0] ?? "Failed to list projects");
    } else {
      setError(null);
    }
  }

  useEffect(() => {
    void refreshProjects();
  }, [apiClient, googleClient]);

  /**
   * Create a blank project from the dialog fields.
   *
   * @returns Promise that settles when create finishes.
   */
  async function createBlankProject(): Promise<void> {
    // Require a non-empty name before calling storage.
    const name = newName.trim();

    if (!name) {
      setError("Project name is required");
      return;
    }

    // Resolve the create target from the dialog selection.
    const source =
      createTargets.length === 1 ? createTargets[0]! : createSource;
    const client = source === "api" ? apiClient : googleClient;

    if (!client) {
      if (source === "google" && isGoogleAvailable && !binding) {
        setCreateOpen(false);
        setConnectOpen(true);
        setError("Connect Google Drive before creating a Drive project");
        return;
      }
      setError("Storage is not connected");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const id = projectIdFromName(name);
      const project = buildBlankProject(id, name, newDescription);
      const created = await client.createProject({ project });
      const createdId = (created.project as unknown as Project).id;
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      navigate(projectPath(source, createdId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  /**
   * Delete the project selected in the confirmation dialog.
   *
   * @returns Promise that settles when delete finishes.
   */
  async function confirmDeleteProject(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    const key = `${deleteTarget.source}:${deleteTarget.id}`;
    setDeletingKey(key);
    setError(null);

    const client = deleteTarget.source === "api" ? apiClient : googleClient;

    if (!client) {
      setError("Storage is not connected");
      setDeletingKey(null);
      return;
    }

    try {
      await client.deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeletingKey(null);
    }
  }

  // Open create dialog with a sensible default source.
  function openCreateDialog(): void {
    if (createTargets.length === 0) {
      if (isGoogleAvailable && !binding) {
        setConnectOpen(true);
        setError("Connect Google Drive or wait for the API to create projects");
        return;
      }
      setError("No storage backend is available");
      return;
    }
    setCreateSource(createTargets[0]!);
    setCreateOpen(true);
  }

  const compactLayout = useCompactToolbarLayout();
  const showConnectDrive = isApiAvailable && isGoogleAvailable && !binding;

  // Page actions folded into the compact overflow menu.
  const pageToolbarItems: ToolbarOverflowMenuItem[] = [];

  if (showConnectDrive) {
    pageToolbarItems.push({
      id: "connect-drive",
      label: "Connect Google Drive",
      icon: <CloudIcon fontSize="small" />,
      onClick: () => setConnectOpen(true),
    });
  }

  pageToolbarItems.push({
    id: "new-project",
    label: "New project",
    icon: <AddIcon fontSize="small" />,
    onClick: openCreateDialog,
  });

  return (
    <PageShell>
      <AppToolbar
        startActions={<ToolbarNavButton kind="home" to="/" />}
        endActions={<RoboreanResponsiveToolbarEnd items={pageToolbarItems} />}
      >
        <AppToolbarTitle>Projects</AppToolbarTitle>
        {!compactLayout && showConnectDrive ? (
          <ToolbarActionButton
            label="Connect Google Drive"
            icon={<CloudIcon fontSize="small" />}
            variant="outlined"
            onClick={() => setConnectOpen(true)}
          />
        ) : null}
        {!compactLayout ? (
          <ToolbarActionButton
            label="New project"
            icon={<AddIcon fontSize="small" />}
            variant="contained"
            onClick={openCreateDialog}
          />
        ) : null}
      </AppToolbar>
      <Stack spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <List>
          {projects.map((project) => {
            // Stable key across backends that may reuse project ids.
            const key = `${project.source}:${project.id}`;
            return (
              <ListItem
                key={key}
                disablePadding
                secondaryAction={
                  <Button
                    color="error"
                    disabled={deletingKey === key}
                    onClick={() => setDeleteTarget(project)}
                  >
                    Delete
                  </Button>
                }
              >
                <ListItemButton
                  component={RouterLink}
                  to={projectPath(project.source, project.id)}
                  sx={{
                    // Default secondary-action inset fits an IconButton; the
                    // text Delete control is wider and would sit under hover.
                    pr: 12,
                  }}
                >
                  <ListItemText
                    primary={project.name}
                    secondary={`${sourceLabel(project.source)} · ${project.id}`}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Dialog
          open={createOpen}
          onClose={() => {
            if (!creating) {
              setCreateOpen(false);
            }
          }}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>New project</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormTextField
                label="Name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                required
                fullWidth
                autoFocus
              />
              <FormTextField
                label="Description"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              {createTargets.length > 1 ? (
                <FormControl>
                  <FormLabel id="create-source-label">Store in</FormLabel>
                  <RadioGroup
                    aria-labelledby="create-source-label"
                    value={createSource}
                    onChange={(event) =>
                      setCreateSource(event.target.value as StorageSource)
                    }
                  >
                    {createTargets.map((source) => (
                      <FormControlLabel
                        key={source}
                        value={source}
                        control={<Radio />}
                        label={sourceLabel(source)}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button disabled={creating} onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={creating || !newName.trim()}
              onClick={() => void createBlankProject()}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={deleteTarget !== null}
          onClose={() => {
            if (!deletingKey) {
              setDeleteTarget(null);
            }
          }}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>Delete project</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              {deleteTarget
                ? `Delete project "${deleteTarget.name}" (${deleteTarget.id}) from ${sourceLabel(deleteTarget.source)}? This cannot be undone.`
                : ""}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              disabled={deletingKey !== null}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              disabled={deletingKey !== null}
              onClick={() => void confirmDeleteProject()}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        <ConnectDriveDialog
          open={connectOpen}
          onClose={() => setConnectOpen(false)}
        />
      </Stack>
    </PageShell>
  );
}
