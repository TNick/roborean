import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Project } from "@roborean/spec";
import type { ProjectSummary } from "@roborean/api-types";
import { AppToolbar, FormTextField, RoboreanToolbarEnd } from "@roborean/ui";
import { useWorkspace } from "../storage/workspaceContext.js";

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
 * @returns Project list page element.
 */
export function ProjectListPage() {
  const navigate = useNavigate();
  const { client } = useWorkspace();

  // Loaded project summaries from the active storage client.
  const [projects, setProjects] = useState<ProjectSummary[]>([]);

  // True while a blank project create request is in flight.
  const [creating, setCreating] = useState(false);

  // Project id currently being deleted, if any.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Whether the new-project dialog is open.
  const [createOpen, setCreateOpen] = useState(false);

  // Draft fields for the new-project dialog.
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Last user-visible error from create / delete / list refresh.
  const [error, setError] = useState<string | null>(null);

  /**
   * Reload the project list from the API.
   *
   * @returns Promise that settles when the list is updated.
   */
  async function refreshProjects(): Promise<void> {
    if (!client) {
      setProjects([]);
      return;
    }
    try {
      const rows = await client.listProjects();
      setProjects(rows);
      setError(null);
    } catch (err) {
      setProjects([]);
      setError(err instanceof Error ? err.message : "Failed to list projects");
    }
  }

  useEffect(() => {
    void refreshProjects();
  }, [client]);

  /**
   * Create a blank project from the dialog fields.
   *
   * @returns Promise that settles when create finishes.
   */
  async function createBlankProject(): Promise<void> {
    // Require a non-empty name before calling the API.
    const name = newName.trim();

    if (!name) {
      setError("Project name is required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      if (!client) {
        setError("Storage is not connected");
        return;
      }
      const id = projectIdFromName(name);
      const project = buildBlankProject(id, name, newDescription);
      const created = await client.createProject({ project });
      const createdId = (created.project as unknown as Project).id;
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      navigate(`/projects/${createdId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  /**
   * Delete one project after confirmation.
   *
   * @param project - Summary of the project to remove.
   * @returns Promise that settles when delete finishes.
   */
  async function deleteProject(project: ProjectSummary): Promise<void> {
    // Confirm before removing durable project data.
    const confirmed = window.confirm(
      `Delete project "${project.name}" (${project.id})?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(project.id);
    setError(null);

    if (!client) {
      setError("Storage is not connected");
      return;
    }

    try {
      await client.deleteProject(project.id);
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <AppToolbar endActions={<RoboreanToolbarEnd />}>
        <Typography variant="h6" component="h1">
          Projects
        </Typography>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          New project
        </Button>
      </AppToolbar>
      <Stack sx={{ p: 3 }} spacing={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <List>
          {projects.map((project) => (
            <ListItem
              key={project.id}
              secondaryAction={
                <Button
                  color="error"
                  disabled={deletingId === project.id}
                  onClick={() => void deleteProject(project)}
                >
                  Delete
                </Button>
              }
            >
              <ListItemButton
                component={RouterLink}
                to={`/projects/${project.id}`}
              >
                <ListItemText primary={project.name} secondary={project.id} />
              </ListItemButton>
            </ListItem>
          ))}
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
      </Stack>
    </>
  );
}
