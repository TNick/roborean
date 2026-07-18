import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { GOOGLE_API_KEY, pickDriveFolder } from "./googlePicker.js";
import { useWorkspace } from "./workspaceContext.js";
/**
 * Full-page gate that requires a Google Drive folder before the app shell.
 *
 * Rendered as a page overlay (not MUI Dialog) so Google OAuth / Picker UI
 * does not stack under a modal backdrop.
 *
 * @returns Folder connection panel, or null when not required.
 */
export function FolderGateDialog() {
  const {
    isGoogleMode,
    loading,
    binding,
    apis,
    getAccessToken,
    connectFolder,
    error,
  } = useWorkspace();
  // Local form / busy state for the gate actions.
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("Roborean data");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);
  if (!isGoogleMode || binding) {
    return null;
  }
  /**
   * Persist the chosen folder through the shared workspace session.
   *
   * @param id - Drive folder id.
   * @param name - Drive folder display name.
   */
  async function finish(id, name) {
    setBusy(true);
    setLocalError(null);
    try {
      await connectFolder(id, name);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to connect folder",
      );
    } finally {
      setBusy(false);
    }
  }
  /**
   * Create a new Drive folder via the shared API client, then connect.
   */
  async function onCreateFolder() {
    if (!apis) {
      setLocalError("Google APIs are unavailable");
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const created = await apis.drive.createFolder(
        folderName.trim() || "Roborean data",
        "root",
      );
      await connectFolder(created.id, created.name);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to create folder",
      );
    } finally {
      setBusy(false);
    }
  }
  /**
   * Open Google Picker with the shared OAuth token, then connect.
   */
  async function onPickFolder() {
    setBusy(true);
    setLocalError(null);
    try {
      const selected = await pickDriveFolder(getAccessToken ?? undefined);
      await connectFolder(selected.id, selected.name);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Folder picker failed",
      );
    } finally {
      setBusy(false);
    }
  }
  // Disable actions while bootstrapping, connecting, or missing APIs.
  const actionsDisabled = busy || loading || !apis || !getAccessToken;
  const message = localError ?? error;
  return _jsx(Box, {
    sx: {
      position: "fixed",
      inset: 0,
      zIndex: (theme) => theme.zIndex.modal,
      bgcolor: "background.default",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      p: 2,
    },
    children: _jsx(Paper, {
      elevation: 2,
      sx: {
        width: "100%",
        maxWidth: 480,
        p: 3,
      },
      children: _jsxs(Stack, {
        spacing: 2,
        children: [
          _jsx(Typography, {
            variant: "h6",
            component: "h1",
            children: "Select a Google Drive folder",
          }),
          _jsx(Typography, {
            variant: "body2",
            color: "text.secondary",
            children:
              "Roborean stores projects in Google Sheets and Docs inside a folder you choose. Nothing is written until you connect a folder.",
          }),
          !GOOGLE_API_KEY
            ? _jsxs(Alert, {
                severity: "info",
                children: [
                  "Optional: set ",
                  _jsx("code", { children: "VITE_GOOGLE_API_KEY" }),
                  ' for Google Picker. Without it, use "Create a new folder" or paste a folder id.',
                ],
              })
            : null,
          message
            ? _jsx(Alert, { severity: "error", children: message })
            : null,
          (busy || loading) &&
            _jsxs(Stack, {
              direction: "row",
              spacing: 1,
              alignItems: "center",
              children: [
                _jsx(CircularProgress, { size: 18 }),
                _jsx(Typography, {
                  variant: "body2",
                  color: "text.secondary",
                  children: busy
                    ? "Connecting to Google Drive…"
                    : "Checking session…",
                }),
              ],
            }),
          _jsxs(Stack, {
            direction: { xs: "column", sm: "row" },
            spacing: 1,
            children: [
              _jsx(Button, {
                variant: "contained",
                disabled: actionsDisabled,
                onClick: () => {
                  void onCreateFolder();
                },
                children: "Create a new folder",
              }),
              _jsx(Button, {
                variant: "outlined",
                disabled: actionsDisabled,
                onClick: () => {
                  void onPickFolder();
                },
                children: "Choose folder with Google Picker",
              }),
            ],
          }),
          _jsx(Typography, {
            variant: "subtitle2",
            children: "Or paste a folder id",
          }),
          _jsx(TextField, {
            label: "Folder id",
            value: folderId,
            onChange: (event) => setFolderId(event.target.value),
            fullWidth: true,
            required: true,
            disabled: busy || loading,
          }),
          _jsx(TextField, {
            label: "Folder display name",
            value: folderName,
            onChange: (event) => setFolderName(event.target.value),
            fullWidth: true,
            disabled: busy || loading,
          }),
          _jsx(Box, {
            sx: { display: "flex", justifyContent: "flex-end" },
            children: _jsx(Button, {
              variant: "contained",
              disabled: actionsDisabled || !folderId.trim(),
              onClick: () => {
                void finish(folderId.trim(), folderName.trim() || folderId);
              },
              children: "Use this folder",
            }),
          }),
        ],
      }),
    }),
  });
}
