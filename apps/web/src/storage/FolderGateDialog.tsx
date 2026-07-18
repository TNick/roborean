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
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isGoogleMode || binding) {
    return null;
  }

  /**
   * Persist the chosen folder through the shared workspace session.
   *
   * @param id - Drive folder id.
   * @param name - Drive folder display name.
   */
  async function finish(id: string, name: string): Promise<void> {
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
  async function onCreateFolder(): Promise<void> {
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
  async function onPickFolder(): Promise<void> {
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

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal,
        bgcolor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: "100%",
          maxWidth: 480,
          p: 3,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" component="h1">
            Select a Google Drive folder
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Roborean stores projects in Google Sheets and Docs inside a folder
            you choose. Nothing is written until you connect a folder.
          </Typography>
          {!GOOGLE_API_KEY ? (
            <Alert severity="info">
              Optional: set a Google Cloud API key as{" "}
              <code>VITE_GOOGLE_API_KEY</code> (separate from the OAuth client
              id) to enable Google Picker. Without it, use &quot;Create a new
              folder&quot; or paste a folder id.
            </Alert>
          ) : null}
          {message ? <Alert severity="error">{message}</Alert> : null}
          {(busy || loading) && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                {busy ? "Connecting to Google Drive…" : "Checking session…"}
              </Typography>
            </Stack>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              disabled={actionsDisabled}
              onClick={() => {
                void onCreateFolder();
              }}
            >
              Create a new folder
            </Button>
            <Button
              variant="outlined"
              disabled={actionsDisabled}
              onClick={() => {
                void onPickFolder();
              }}
            >
              Choose folder with Google Picker
            </Button>
          </Stack>
          <Typography variant="subtitle2">Or paste a folder id</Typography>
          <TextField
            label="Folder id"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            fullWidth
            required
            disabled={busy || loading}
          />
          <TextField
            label="Folder display name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            fullWidth
            disabled={busy || loading}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              disabled={actionsDisabled || !folderId.trim()}
              onClick={() => {
                void finish(folderId.trim(), folderName.trim() || folderId);
              }}
            >
              Use this folder
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
