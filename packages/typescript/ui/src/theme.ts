import { createTheme } from "@mui/material/styles";
import {
  defaultAppearancePreferences,
  type AppearancePreferences,
} from "./appearancePreferences.js";
import {
  controlStackSpacingForPreset,
  buttonSizeForPreset,
} from "./roboreanThemeAugmentation.js";
import { cssBaselineScrollbarOverrides } from "./scrollbarStyles.js";

/**
 * Map spacing presets to MUI spacing factors.
 *
 * @param spacing - Spacing preset from appearance preferences.
 * @returns MUI theme spacing factor.
 */
function spacingFactorForPreset(
  spacing: AppearancePreferences["spacing"],
): number {
  if (spacing === "compact") {
    return 6;
  }

  if (spacing === "comfortable") {
    return 10;
  }

  return 8;
}

/**
 * Map font size presets to MUI typography base sizes.
 *
 * MUI scales variant sizes from `typography.fontSize` (body2 target px).
 * Changing only `htmlFontSize` keeps most variant px sizes unchanged.
 *
 * @param fontSize - Font size preset from appearance preferences.
 * @returns Body typography base size in pixels.
 */
function typographyFontSizeForPreset(
  fontSize: AppearancePreferences["fontSize"],
): number {
  if (fontSize === "small") {
    return 12;
  }

  if (fontSize === "large") {
    return 16;
  }

  return 14;
}

/**
 * Build a Roborean MUI theme from appearance preferences.
 *
 * @param preferences - Host appearance preferences.
 * @returns Configured MUI theme.
 */
export function createRoboreanTheme(
  preferences: AppearancePreferences = defaultAppearancePreferences,
) {
  const isDark = preferences.colorMode === "black";
  const buttonSize = buttonSizeForPreset(preferences.spacing);

  return createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary: { main: "#0b4f6c" },
      secondary: { main: "#145c9e" },
      background: isDark
        ? { default: "#121821", paper: "#1a2330" }
        : { default: "#f4f7fb", paper: "#ffffff" },
    },
    typography: {
      fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
      htmlFontSize: 16,
      fontSize: typographyFontSizeForPreset(preferences.fontSize),
    },
    spacing: spacingFactorForPreset(preferences.spacing),
    roborean: {
      controlStackSpacing: controlStackSpacingForPreset(preferences.spacing),
      fieldVariant: preferences.fieldVariant,
      buttonSize,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => cssBaselineScrollbarOverrides(theme),
      },
      MuiButton: {
        defaultProps: {
          size: buttonSize,
        },
      },
      MuiIconButton: {
        defaultProps: {
          size: buttonSize,
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: preferences.fieldVariant,
        },
      },
    },
  });
}

/** Default Roborean theme for hosts that do not use the adapter. */
export const roboreanTheme = createRoboreanTheme(defaultAppearancePreferences);
