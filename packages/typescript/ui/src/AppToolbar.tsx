import type { ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";

/**
 * Props for the shared application toolbar shell.
 */
export type AppToolbarProps = {
  /** Page-specific toolbar controls rendered on the left. */
  children: ReactNode;

  /** Optional global controls rendered after the spacer on the right. */
  endActions?: ReactNode;
};

/**
 * Sticky top toolbar with page actions and optional global end actions.
 *
 * @param props - Toolbar children and optional end actions.
 * @returns Application toolbar element.
 */
export function AppToolbar({ children, endActions }: AppToolbarProps) {
  return (
    <AppBar position="sticky" color="default" elevation={0}>
      <Toolbar variant="dense" sx={{ flexWrap: "wrap", gap: 1, minHeight: 48 }}>
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
