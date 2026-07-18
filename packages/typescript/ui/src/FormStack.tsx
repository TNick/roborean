import Stack, { type StackProps } from "@mui/material/Stack";
import { useControlStackSpacing } from "./useControlStackSpacing.js";

/**
 * Vertical stack for form controls with theme-driven spacing between fields.
 *
 * @param props - Stack props; `spacing` overrides the theme default when set.
 * @returns Stack element for form field groups.
 */
export function FormStack({ spacing, ...props }: StackProps) {
  // Theme spacing unless the caller overrides it explicitly.
  const controlSpacing = useControlStackSpacing();

  return <Stack spacing={spacing ?? controlSpacing} {...props} />;
}
