import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  AppToolbar,
  AppToolbarTitle,
  RoboreanResponsiveToolbarEnd,
  useCompactToolbarLayout,
} from "@roborean/ui";
import { PageShell } from "../components/PageShell.js";
import { ConnectDriveDialog } from "../storage/ConnectDriveDialog.js";
import { useWorkspace } from "../storage/workspaceContext.js";

/**
 * Landing page with entry points into projects and templates.
 *
 * @returns Home page element.
 */
export function HomePage() {
  const {
    binding,
    disconnect,
    isGoogleMode,
    isApiAvailable,
    isGoogleAvailable,
  } = useWorkspace();

  // Stack panels and center large actions below md.
  const compactLayout = useCompactToolbarLayout();

  // Optional Drive connect dialog when API is also available.
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <PageShell>
      <AppToolbar endActions={<RoboreanResponsiveToolbarEnd />}>
        <AppToolbarTitle sx={{ fontWeight: 700 }}>Roborean</AppToolbarTitle>
      </AppToolbar>
      <Box
        sx={{
          maxWidth: 720,
          mx: { xs: "auto", md: 0 },
          px: { xs: 3, md: 0 },
          py: { xs: 4, md: 0 },
          display: "flex",
          flexDirection: "column",
          alignItems: { xs: "center", md: "flex-start" },
          textAlign: { xs: "center", md: "left" },
        }}
      >
        <Typography
          variant="h6"
          sx={{ mb: { xs: 4, md: 3 }, color: "text.secondary" }}
        >
          Schema-first projects, workspace bits, and document generation.
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={{ xs: 3, md: 2 }}
          alignItems={{ xs: "stretch", md: "flex-start" }}
          sx={{
            width: { xs: "100%", md: "auto" },
            maxWidth: { xs: 360, md: "none" },
          }}
          useFlexGap
        >
          <Button
            component={RouterLink}
            to="/projects"
            variant="contained"
            size={compactLayout ? "large" : "medium"}
            fullWidth={compactLayout}
          >
            Open projects
          </Button>
          <Button
            component={RouterLink}
            to="/templates"
            variant="outlined"
            size={compactLayout ? "large" : "medium"}
            fullWidth={compactLayout}
          >
            Browse templates library
          </Button>
          {!isGoogleMode && isGoogleAvailable && !binding ? (
            <Button
              variant="outlined"
              size={compactLayout ? "large" : "medium"}
              fullWidth={compactLayout}
              onClick={() => setConnectOpen(true)}
            >
              Connect Google Drive
            </Button>
          ) : null}
          {isGoogleAvailable && binding ? (
            <Button
              variant="outlined"
              color="warning"
              size={compactLayout ? "large" : "medium"}
              fullWidth={compactLayout}
              onClick={disconnect}
            >
              {isGoogleMode ? "Change Drive folder" : "Disconnect Google Drive"}
            </Button>
          ) : null}
        </Stack>
      </Box>
      <ConnectDriveDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
      />
    </PageShell>
  );
}
