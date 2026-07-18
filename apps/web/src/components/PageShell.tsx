import type { ReactNode } from "react";
import Stack from "@mui/material/Stack";

/**
 * Props for the shared page inset shell.
 */
export interface PageShellProps {
  /** Page toolbar and body content. */
  children: ReactNode;
}

/**
 * Outer page inset matching the project editor chrome.
 *
 * Applies padding from `md` up; below `md` the page is edge-to-edge so compact
 * layouts can use the full viewport width.
 *
 * @param props - Page children to inset.
 * @returns Page stack with responsive inset.
 */
export function PageShell({ children }: PageShellProps) {
  return (
    <Stack spacing={2} sx={{ p: { xs: 0, md: 2 } }}>
      {children}
    </Stack>
  );
}
