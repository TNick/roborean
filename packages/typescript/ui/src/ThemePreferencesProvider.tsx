import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { AppearancePreferences } from "./appearancePreferences.js";
import { createRoboreanTheme } from "./theme.js";
import {
  loadThemePreferences,
  saveThemePreferences,
} from "./themePreferences.js";

/**
 * Context value for Roborean appearance preferences.
 */
export type ThemePreferencesContextValue = {
  /** Current appearance preferences. */
  preferences: AppearancePreferences;

  /**
   * Replace appearance preferences and persist them.
   *
   * @param next - Updated appearance preferences.
   */
  setPreferences: (next: AppearancePreferences) => void;
};

const ThemePreferencesContext =
  createContext<ThemePreferencesContextValue | null>(null);

/**
 * Props for the optional Roborean theme preferences provider.
 */
export type ThemePreferencesProviderProps = {
  /** Application tree rendered inside the themed provider. */
  children: ReactNode;
};

/**
 * Optional adapter that owns Roborean appearance prefs and MUI theme wiring.
 *
 * @param props - Child application tree.
 * @returns Provider wrapping children with theme and baseline styles.
 */
export function ThemePreferencesProvider({
  children,
}: ThemePreferencesProviderProps) {
  // Hydrate persisted preferences on first render.
  const [preferences, setPreferencesState] = useState(loadThemePreferences);

  // Build the active MUI theme from current preferences.
  const theme = useMemo(() => createRoboreanTheme(preferences), [preferences]);

  /**
   * Update preferences in memory and local storage.
   *
   * @param next - Updated appearance preferences.
   */
  function setPreferences(next: AppearancePreferences): void {
    setPreferencesState(next);
    saveThemePreferences(next);
  }

  const value = useMemo(() => ({ preferences, setPreferences }), [preferences]);

  return (
    <ThemePreferencesContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemePreferencesContext.Provider>
  );
}

/**
 * Read Roborean appearance preferences from the optional adapter provider.
 *
 * @returns Current preferences and setter.
 */
export function useThemePreferences(): ThemePreferencesContextValue {
  const context = useContext(ThemePreferencesContext);

  if (!context) {
    throw new Error(
      "useThemePreferences must be used within ThemePreferencesProvider",
    );
  }

  return context;
}
