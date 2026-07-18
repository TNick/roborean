import type { FieldVariant, SpacingPreset } from "./appearancePreferences.js";

/** MUI button size tokens driven by spacing presets. */
export type ButtonSize = "small" | "medium" | "large";

declare module "@mui/material/styles" {
  /**
   * Roborean layout tokens attached to the MUI theme.
   */
  interface Theme {
    /** Roborean-specific layout tokens for host apps. */
    roborean: {
      /** Stack spacing multiplier for consecutive form controls. */
      controlStackSpacing: number;

      /** Default TextField variant for value editors. */
      fieldVariant: FieldVariant;

      /** Default button size for chrome and actions. */
      buttonSize: ButtonSize;
    };
  }

  /**
   * Partial Roborean layout tokens for theme creation.
   */
  interface ThemeOptions {
    /** Roborean-specific layout tokens for host apps. */
    roborean?: {
      /** Stack spacing multiplier for consecutive form controls. */
      controlStackSpacing?: number;

      /** Default TextField variant for value editors. */
      fieldVariant?: FieldVariant;

      /** Default button size for chrome and actions. */
      buttonSize?: ButtonSize;
    };
  }
}

/**
 * Map spacing presets to vertical form control stack spacing multipliers.
 *
 * @param spacing - Spacing preset from appearance preferences.
 * @returns MUI Stack spacing multiplier for form fields.
 */
export function controlStackSpacingForPreset(spacing: SpacingPreset): number {
  if (spacing === "compact") {
    return 2;
  }

  if (spacing === "comfortable") {
    return 3;
  }

  return 2.5;
}

/**
 * Map spacing presets to default MUI button sizes.
 *
 * @param spacing - Spacing preset from appearance preferences.
 * @returns MUI button size token.
 */
export function buttonSizeForPreset(spacing: SpacingPreset): ButtonSize {
  if (spacing === "compact") {
    return "small";
  }

  if (spacing === "comfortable") {
    return "large";
  }

  return "medium";
}

/** Default form control stack spacing when no Roborean theme is present. */
export const defaultControlStackSpacing = 2.5;

/** Default TextField variant when no Roborean theme is present. */
export const defaultFieldVariant: FieldVariant = "outlined";

/** Default button size when no Roborean theme is present. */
export const defaultButtonSize: ButtonSize = "medium";
