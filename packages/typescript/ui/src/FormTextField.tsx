import MuiTextField, { type TextFieldProps } from "@mui/material/TextField";
import { useFieldVariant } from "./useFieldVariant.js";

/**
 * Text field for form value editors with theme-driven variant defaults.
 *
 * @param props - MUI TextField props; `variant` overrides the theme default.
 * @returns Text field element.
 */
export function FormTextField({ variant, ...props }: TextFieldProps) {
  // Theme variant unless the caller overrides it explicitly.
  const fieldVariant = useFieldVariant();

  return <MuiTextField variant={variant ?? fieldVariant} {...props} />;
}
