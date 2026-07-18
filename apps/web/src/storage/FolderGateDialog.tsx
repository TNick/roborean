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
   * Open the Google Picker when the library is available.
   *
   * @returns Promise that settles when a folder is chosen or cancelled.
   */
  async function connectWithPicker(): Promise<void> {
    const host = globalThis as unknown as {
      google?: {
        picker?: {
          PickerBuilder: new () => {
            addView: (view: unknown) => unknown;
            setOAuthToken: (token: string) => unknown;
            setDeveloperKey: (key: string) => unknown;
            setCallback: (
              cb: (data: {
                action?: string;
                docs?: Array<{ id?: string; name?: string }>;
              }) => void,
            ) => unknown;
            build: () => { setVisible: (visible: boolean) => void };
          };
          ViewId: { FOLDERS: unknown };
          Action: { PICKED: string };
        };
        accounts?: {
          oauth2?: {
            initTokenClient: (config: {
              client_id: string;
              scope: string;
              callback: (response: {
                access_token?: string;
                error?: string;
              }) => void;
            }) => { requestAccessToken: () => void };
          };
        };
      };
    };

    if (
      !GOOGLE_CLIENT_ID ||
      !host.google?.picker ||
      !host.google.accounts?.oauth2
    ) {
      setLocalError(
        "Google Picker is unavailable; paste a Drive folder id below",
      );
      return;
    }

    setConnecting(true);
    setLocalError(null);

    try {
      const token = await new Promise<string>((resolve, reject) => {
        const client = host.google!.accounts!.oauth2!.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "https://www.googleapis.com/auth/drive.file",
          callback: (response) => {
            if (!response.access_token) {
              reject(new Error(response.error ?? "OAuth failed"));
              return;
            }
            resolve(response.access_token);
          },
        });
        client.requestAccessToken();
      });

      await new Promise<void>((resolve, reject) => {
        const picker = new host.google!.picker!.PickerBuilder()
          .addView(host.google!.picker!.ViewId.FOLDERS)
          .setOAuthToken(token)
          .setCallback((data) => {
            if (data.action === host.google!.picker!.Action.PICKED) {
              const doc = data.docs?.[0];
              if (!doc?.id) {
                reject(new Error("No folder selected"));
                return;
              }
              void connectFolder(doc.id, doc.name ?? "Roborean folder")
                .then(() => resolve())
                .catch(reject);
              return;
            }
            if (data.action === "cancel") {
              resolve();
            }
          })
          .build();
        picker.setVisible(true);
      });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Folder picker failed",
      );
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
          {error ? <Alert severity="error">{error}</Alert> : null}
          {localError ? <Alert severity="error">{localError}</Alert> : null}
          <Button
            variant="contained"
            disabled={connecting || loading || !GOOGLE_CLIENT_ID}
            onClick={() => void connectWithPicker()}
          >
            Choose folder with Google Picker
          </Button>
          <Typography variant="subtitle2">Or paste a folder id</Typography>
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
