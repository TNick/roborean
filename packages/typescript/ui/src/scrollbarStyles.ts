import type { Theme } from "@mui/material/styles";

/**
 * Scrollbar colors derived from the active MUI palette mode.
 *
 * @param theme - Active MUI theme.
 * @returns Track, thumb, and hover colors for scrollbars.
 */
function scrollbarColors(theme: Theme): {
  track: string;
  thumb: string;
  thumbHover: string;
} {
  const isDark = theme.palette.mode === "dark";

  if (isDark) {
    return {
      track: "#232d3b",
      thumb: "#5a677a",
      thumbHover: "#738296",
    };
  }

  return {
    track: "#e8edf3",
    thumb: "#b7c0cc",
    thumbHover: "#98a3b3",
  };
}

/**
 * Global scrollbar styling for CssBaseline (Firefox + WebKit).
 *
 * @param theme - Active MUI theme.
 * @returns CssBaseline style overrides for scrollbars.
 */
export function cssBaselineScrollbarOverrides(
  theme: Theme,
): Record<string, unknown> {
  const { track, thumb, thumbHover } = scrollbarColors(theme);

  return {
    "*": {
      scrollbarWidth: "thin",
      scrollbarColor: `${thumb} ${track}`,
    },
    "*::-webkit-scrollbar": {
      width: 8,
      height: 8,
    },
    "*::-webkit-scrollbar-track": {
      backgroundColor: track,
    },
    "*::-webkit-scrollbar-thumb": {
      backgroundColor: thumb,
      borderRadius: 4,
      border: `2px solid ${track}`,
    },
    "*::-webkit-scrollbar-thumb:hover": {
      backgroundColor: thumbHover,
    },
  };
}

/**
 * Theme-aware scrollbar styling for one scrollable element.
 *
 * @param theme - Active MUI theme.
 * @returns `sx` fragment for scrollable regions.
 */
export function themedScrollbarSx(theme: Theme): Record<string, unknown> {
  const { track, thumb, thumbHover } = scrollbarColors(theme);

  return {
    scrollbarWidth: "thin",
    scrollbarColor: `${thumb} ${track}`,
    "&::-webkit-scrollbar": {
      width: 8,
      height: 8,
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: track,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: thumb,
      borderRadius: 4,
      border: `2px solid ${track}`,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      backgroundColor: thumbHover,
    },
  };
}
