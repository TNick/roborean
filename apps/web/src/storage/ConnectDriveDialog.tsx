import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { DriveFolderConnectForm } from "./DriveFolderConnectForm.js";

/**
 * Props for the optional Drive connect overlay.
 */
export interface ConnectDriveDialogProps {
  /**
   * Whether the overlay is open.
   */
  open: boolean;

  /**
   * Called when the overlay should close.
   */
  onClose: () => void;
}

/**
 * Optional overlay to connect Google Drive when FastAPI is also available.
 *
 * Uses a page overlay (not MUI Dialog) so Google OAuth / Picker UI does not
 * stack under a modal backdrop.
 *
 * @param props - Open state and close handler.
 * @returns Overlay element, or null when closed.
 */
export function ConnectDriveDialog(props: ConnectDriveDialogProps) {
  const { open, onClose } = props;

  if (!open) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal,
        bgcolor: "rgba(0, 0, 0, 0.4)",
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
          <DriveFolderConnectForm
            title="Connect Google Drive"
            description="Optionally store projects in a Drive folder alongside the local API. You can keep using API projects without connecting Drive."
            onConnected={onClose}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Button variant="text" onClick={onClose}>
              Not now
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
