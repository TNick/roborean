import {
  defaultAppearancePreferences,
  type AppearancePreferences,
} from "./appearancePreferences.js";

/** Storage key for persisted Roborean appearance preferences. */
export const THEME_PREFERENCES_STORAGE_KEY = "roborean.ui.preferences";

/**
 * Load appearance preferences from browser storage.
 *
 * @returns Parsed preferences or defaults when storage is missing or invalid.
 */
export function loadThemePreferences(): AppearancePreferences {
  if (typeof window === "undefined") {
    return defaultAppearancePreferences;
  }

  const raw = window.localStorage.getItem(THEME_PREFERENCES_STORAGE_KEY);

  if (!raw) {
    return defaultAppearancePreferences;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppearancePreferences>;

    return {
      colorMode: parsed.colorMode ?? defaultAppearancePreferences.colorMode,
      spacing: parsed.spacing ?? defaultAppearancePreferences.spacing,
      fontSize: parsed.fontSize ?? defaultAppearancePreferences.fontSize,
      fieldVariant:
        parsed.fieldVariant ?? defaultAppearancePreferences.fieldVariant,
    };
  } catch {
    return defaultAppearancePreferences;
  }
}

/**
 * Persist appearance preferences to browser storage.
 *
 * @param preferences - Preferences to store.
 */
export function saveThemePreferences(preferences: AppearancePreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    THEME_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
}
