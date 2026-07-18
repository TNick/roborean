import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
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
  return _jsxs(_Fragment, {
    children: [
      _jsx(AppToolbar, {
        endActions: _jsx(RoboreanToolbarEnd, {}),
        children: _jsx(Typography, {
          variant: "h6",
          component: "h1",
          sx: { fontWeight: 700 },
          children: "Roborean",
        }),
      }),
      _jsxs(Box, {
        sx: { p: 6, maxWidth: 720 },
        children: [
          _jsx(Typography, {
            variant: "h6",
            sx: { mb: 3, color: "text.secondary" },
            children:
              "Schema-first projects, workspace bits, and document generation.",
          }),
          isGoogleMode
            ? _jsxs(Alert, {
                severity: "info",
                sx: { mb: 2 },
                children: [
                  "Browser Google Workspace mode",
                  binding
                    ? `: connected to “${binding.rootFolderName}”.`
                    : ": select a Drive folder to continue.",
                ],
              })
            : null,
          _jsxs(Stack, {
            direction: "row",
            spacing: 2,
            children: [
              _jsx(Button, {
                component: RouterLink,
                to: "/projects",
                variant: "contained",
                children: "Open projects",
              }),
              !IS_GOOGLE_MODE
                ? _jsx(Button, {
                    component: RouterLink,
                    to: "/templates",
                    variant: "outlined",
                    children: "Browse templates library",
                  })
                : null,
              isGoogleMode && binding
                ? _jsx(Button, {
                    variant: "outlined",
                    color: "warning",
                    onClick: disconnect,
                    children: "Change Drive folder",
                  })
                : null,
            ],
          }),
        ],
      }),
    ],
  });
}
