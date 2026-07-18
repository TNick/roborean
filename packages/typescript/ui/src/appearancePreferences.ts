/**
 * Host-neutral appearance control model for theme settings menus.
 */
export type ColorMode = "white" | "black";

/**
 * Density preset for layout spacing.
 */
export type SpacingPreset = "compact" | "default" | "comfortable";

/**
 * Font size preset for typography scaling.
 */
export type FontSizePreset = "small" | "medium" | "large";

/**
 * Text field surface variant for value editors.
 */
export type FieldVariant = "outlined" | "filled" | "standard";

/**
 * Combined appearance preferences exposed by the theme settings menu.
 */
export type AppearancePreferences = {
  /** Light or dark surface palette. */
  colorMode: ColorMode;

  /** Layout spacing density. */
  spacing: SpacingPreset;

  /** Base font size preset. */
  fontSize: FontSizePreset;

  /** Text field variant for form value editors. */
  fieldVariant: FieldVariant;
};

/**
 * Default appearance preferences for Roborean hosts.
 */
export const defaultAppearancePreferences: AppearancePreferences = {
  colorMode: "white",
  spacing: "default",
  fontSize: "medium",
  fieldVariant: "outlined",
};
