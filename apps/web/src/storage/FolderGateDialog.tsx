import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { FormTextField } from "@roborean/ui";
import { GOOGLE_CLIENT_ID } from "../config.js";
import {
  createDriveFolder,
  GOOGLE_API_KEY,
  pickDriveFolder,
} from "./googlePicker.js";
import { useWorkspace } from "./workspaceContext.js";

/**
 * Blocking dialog that forces Drive folder selection in Google mode.
 *
 * @returns Folder gate dialog element, or null when not required.
 */
export function FolderGateDialog() {
  const { isGoogleMode, binding, loading, error, connectFolder } =
    useWorkspace();

  // Manual folder fields used when the Google Picker is unavailable.
  const [folderId, setFolderId] = useState("");
  const [folderName, setFolderName] = useState("Roborean data");
  const [connecting, setConnecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Only block Google mode until a binding exists.
  if (!isGoogleMode || binding) {
    return null;
  }

  /**
   * Connect using the manual folder fields.
   *
   * @returns Promise that settles when connect finishes.
   */
  async function connectManual(): Promise<void> {
    const id = folderId.trim();
    const name = folderName.trim() || "Roborean folder";
    if (!id) {
      setLocalError("Folder id is required");
      return;
    }
    setConnecting(true);
    setLocalError(null);
    try {
      await connectFolder(id, name);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to connect folder",
      );
    } finally {
      setConnecting(false);
    }
  }

  /**
   * Create a new Drive folder and bind the workspace to it.
   *
   * @returns Promise that settles when connect finishes.
   */
  async function connectNewFolder(): Promise<void> {
    setConnecting(true);
    setLocalError(null);
    try {
      const name = folderName.trim() || "Roborean data";
      const created = await createDriveFolder(name);
      await connectFolder(created.id, created.name);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to create Drive folder",
      );
    } finally {
      setConnecting(false);
    }
  }

  /**
   * Open the Google Picker after loading the picker library.
   *
   * @returns Promise that settles when a folder is chosen or cancelled.
   */
  async function connectWithPicker(): Promise<void> {
    if (!GOOGLE_CLIENT_ID) {
      setLocalError("Missing VITE_GOOGLE_CLIENT_ID for this static build");
      return;
    }

    setConnecting(true);
    setLocalError(null);

    try {
      const selected = await pickDriveFolder();
      await connectFolder(selected.id, selected.name);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Folder picker failed";
      // Keep the dialog usable when picker/API key is unavailable.
      if (
        message.includes("Picker") ||
        message.includes("Timed out") ||
        message.includes("cancelled")
      ) {
        setLocalError(
          `${message}. You can create a new folder or paste a Drive folder id below.`,
        );
      } else {
        setLocalError(message);
      }
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Dialog open fullWidth maxWidth="sm">
      <DialogTitle>Select a Google Drive folder</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Roborean stores projects in a companion Google Sheet and writes
            generated documents as Google Docs under the folder you choose.
            Everything is written only inside that folder.
          </Typography>
          {!GOOGLE_CLIENT_ID ? (
            <Alert severity="error">
              Missing `VITE_GOOGLE_CLIENT_ID` for this static build.
            </Alert>
          ) : null}
          {!GOOGLE_API_KEY ? (
            <Alert severity="info">
              Optional: set `VITE_GOOGLE_API_KEY` for Google Picker. Without it,
              use “Create a new folder” or paste a folder id.
            </Alert>
          ) : null}
          {error ? <Alert severity="error">{error}</Alert> : null}
          {localError ? <Alert severity="error">{localError}</Alert> : null}
          <Button
            variant="contained"
            disabled={connecting || loading || !GOOGLE_CLIENT_ID}
            onClick={() => void connectNewFolder()}
          >
            Create a new folder
          </Button>
          <Button
            variant="outlined"
            disabled={connecting || loading || !GOOGLE_CLIENT_ID}
            onClick={() => void connectWithPicker()}
          >
            Choose folder with Google Picker
          </Button>
          <Typography variant="subtitle2">Or paste a folder id</Typography>
          <Typography variant="caption" color="text.secondary">
            In Drive, open the folder and copy the id from the URL after
            `/folders/`.
          </Typography>
          <FormTextField
            label="Folder id"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
            fullWidth
            required
          />
          <FormTextField
            label="Folder display name"
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          disabled={connecting || loading || !folderId.trim()}
          onClick={() => void connectManual()}
        >
          Use this folder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
