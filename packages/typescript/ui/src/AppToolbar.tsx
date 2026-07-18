import type { ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";

/**
 * Props for the shared application toolbar shell.
 */
export type AppToolbarProps = {
  /** Page-specific toolbar controls rendered after optional start actions. */
  children: ReactNode;

  /**
   * Optional navigation or leading controls rendered before the page title.
   */
  startActions?: ReactNode;

  /** Optional global controls rendered after the spacer on the right. */
  endActions?: ReactNode;
};

/**
 * Sticky top toolbar with page actions and optional global end actions.
 *
 * @param props - Toolbar children and optional start/end actions.
 * @returns Application toolbar element.
 */
export function AppToolbar({
  children,
  startActions,
  endActions,
}: AppToolbarProps) {
  return (
    <AppBar position="sticky" color="default" elevation={0}>
      <Toolbar variant="dense" sx={{ flexWrap: "wrap", gap: 1, minHeight: 48 }}>
        {startActions ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {startActions}
          </Box>
        ) : null}
        {children}
        <Box sx={{ flexGrow: 1 }} />
        {endActions ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {endActions}
          </Box>
        ) : null}
      </Toolbar>
    </AppBar>
  );
}
