import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { DriveFolderConnectForm } from "./DriveFolderConnectForm.js";
import { useWorkspace } from "./workspaceContext.js";

/**
 * Full-page gate that requires a Google Drive folder before the app shell.
 *
 * Only shown for Google-only builds (e.g. GitHub Pages). When FastAPI is
 * available, Drive is optional and this gate stays hidden.
 *
 * Rendered as a page overlay (not MUI Dialog) so Google OAuth / Picker UI
 * does not stack under a modal backdrop.
 *
 * @returns Folder connection panel, or null when not required.
 */
export function FolderGateDialog() {
  const { googleRequired, binding, isGoogleAvailable } = useWorkspace();

  if (!googleRequired || !isGoogleAvailable || binding) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal,
        'body[data-roborean-picker-active="true"] &': {
          zIndex: 0,
          pointerEvents: "none",
        },
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
        <DriveFolderConnectForm />
      </Paper>
    </Box>
  );
}
