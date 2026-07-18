import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ProjectEditor } from "@roborean/editor";
import { RoboreanToolbarEnd } from "@roborean/ui";
import { API_BASE_URL, IS_GOOGLE_MODE } from "../config.js";
import { useWorkspace } from "../storage/workspaceContext.js";
/**
 * Loads one project and hosts the editor with delete support.
 *
 * @returns Project edit page element.
 */
export function ProjectEditPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { client } = useWorkspace();
  // Loaded project document, or null while loading / on failure.
  const [project, setProject] = useState(null);
  // True while a delete request is in flight.
  const [deleting, setDeleting] = useState(false);
  // Last user-visible error from load or delete.
  const [error, setError] = useState(null);
  // True once the initial load attempt has finished.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setProject(null);
    setError(null);
    if (!client) {
      setLoaded(true);
      setError("Storage is not connected");
      return;
    }
    client
      .getProject(id)
      .then((detail) => {
        if (!cancelled) {
          setProject(detail.project);
        }
      })
      .catch((err) => {
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
  }, [id, client]);
  /**
   * Delete the current project after confirmation.
   *
   * @returns Promise that settles when delete finishes.
   */
  async function deleteCurrentProject() {
    if (!project || !client) {
      return;
    }
    // Confirm before removing durable project data.
    const confirmed = window.confirm(
      `Delete project "${project.name}" (${project.id})?`,
    );
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await client.deleteProject(id);
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  }
  if (!loaded) {
    return _jsx(Stack, {
      alignItems: "center",
      sx: { p: 4 },
      children: _jsx(CircularProgress, {}),
    });
  }
  if (!project) {
    return _jsxs(Stack, {
      sx: { p: 3 },
      spacing: 2,
      children: [
        error ? _jsx(Alert, { severity: "error", children: error }) : null,
        _jsx(Typography, { children: "Project not found." }),
        _jsx(Button, {
          onClick: () => navigate("/projects"),
          children: "Back to projects",
        }),
      ],
    });
  }
  return _jsxs(Stack, {
    sx: { p: 2 },
    spacing: 2,
    children: [
      error ? _jsx(Alert, { severity: "error", children: error }) : null,
      _jsx(ProjectEditor, {
        project: project,
        projectId: id,
        client: client ?? undefined,
        apiBaseUrl: IS_GOOGLE_MODE ? undefined : API_BASE_URL,
        runLabel: IS_GOOGLE_MODE ? "Run in browser" : "Run on server",
        deleting: deleting,
        onChange: setProject,
        onDelete: deleteCurrentProject,
        toolbarEnd: _jsx(RoboreanToolbarEnd, {}),
      }),
    ],
  });
}
