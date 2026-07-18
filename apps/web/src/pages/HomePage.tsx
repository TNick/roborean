import { Link as RouterLink } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppToolbar, RoboreanToolbarEnd } from "@roborean/ui";
import { IS_GOOGLE_MODE } from "../config.js";
import { useWorkspace } from "../storage/workspaceContext.js";

/**
 * Landing page with entry points into projects and templates.
 *
 * @returns Home page element.
 */
export function HomePage() {
  const { binding, disconnect, isGoogleMode } = useWorkspace();

  return (
    <>
      <AppToolbar endActions={<RoboreanToolbarEnd />}>
        <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
          Roborean
        </Typography>
      </AppToolbar>
      <Box sx={{ p: 6, maxWidth: 720 }}>
        <Typography variant="h6" sx={{ mb: 3, color: "text.secondary" }}>
          Schema-first projects, workspace bits, and document generation.
        </Typography>
        {isGoogleMode ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Browser Google Workspace mode
            {binding
              ? `: connected to “${binding.rootFolderName}”.`
              : ": select a Drive folder to continue."}
          </Alert>
        ) : null}
        <Stack direction="row" spacing={2}>
          <Button component={RouterLink} to="/projects" variant="contained">
            Open projects
          </Button>
          {!IS_GOOGLE_MODE ? (
            <Button component={RouterLink} to="/templates" variant="outlined">
              Browse templates library
            </Button>
          ) : null}
          {isGoogleMode && binding ? (
            <Button variant="outlined" color="warning" onClick={disconnect}>
              Change Drive folder
            </Button>
          ) : null}
        </Stack>
      </Box>
    </>
  );
}
