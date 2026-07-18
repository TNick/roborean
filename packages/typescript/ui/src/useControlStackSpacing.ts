import { useTheme } from "@mui/material/styles";
import { defaultControlStackSpacing } from "./roboreanThemeAugmentation.js";

/**
 * Read the theme-driven spacing multiplier for consecutive form controls.
 *
 * @returns MUI Stack spacing multiplier for vertical form layouts.
 */
export function useControlStackSpacing(): number {
  const theme = useTheme();

  return theme.roborean?.controlStackSpacing ?? defaultControlStackSpacing;
}
