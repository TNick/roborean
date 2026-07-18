import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/**
 * Whether the viewport uses the compact toolbar layout (overflow menu).
 *
 * Matches the project editor breakpoint: below `md`.
 *
 * @returns True when toolbar actions should collapse into one menu.
 */
export function useCompactToolbarLayout(): boolean {
  const theme = useTheme();

  return useMediaQuery(theme.breakpoints.down("md"), {
    noSsr: true,
  });
}
