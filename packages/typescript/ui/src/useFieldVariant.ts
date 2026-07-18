import { useTheme } from "@mui/material/styles";
import { defaultFieldVariant } from "./roboreanThemeAugmentation.js";

/**
 * Read the theme-driven TextField variant for value editors.
 *
 * @returns MUI TextField variant name.
 */
export function useFieldVariant() {
  const theme = useTheme();

  return theme.roborean?.fieldVariant ?? defaultFieldVariant;
}
