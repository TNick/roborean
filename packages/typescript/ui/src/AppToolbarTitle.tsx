import type { ReactNode } from "react";
import Typography, { type TypographyProps } from "@mui/material/Typography";

/**
 * Props for the shared application toolbar page title.
 */
export type AppToolbarTitleProps = {
  /** Page title content shown in the toolbar. */
  children: ReactNode;

  /** Truncate overflowing title text to a single line. */
  noWrap?: boolean;

  /** Extra styles merged after the default title spacing. */
  sx?: TypographyProps["sx"];
};

/**
 * Page title for `AppToolbar` with responsive left/right breathing room.
 *
 * Horizontal margin scales with viewport width so the title stands out when
 * space allows and stays compact on narrow layouts.
 *
 * @param props - Title content and optional typography overrides.
 * @returns Toolbar page title element.
 */
export function AppToolbarTitle({
  children,
  noWrap,
  sx,
}: AppToolbarTitleProps) {
  return (
    <Typography
      variant="h6"
      component="h1"
      noWrap={noWrap}
      sx={[
        {
          minWidth: 0,
          mx: "clamp(0.25rem, 2.5vw, 2rem)",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Typography>
  );
}
