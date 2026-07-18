import { ThemeSettingsButton } from "./ThemeSettingsButton.js";
import { UserMenuButton } from "./UserMenuButton.js";
import { useThemePreferences } from "./ThemePreferencesProvider.js";

/**
 * Roborean default global toolbar actions wired to the preferences adapter.
 *
 * @returns Theme and user menu buttons for `AppToolbar.endActions`.
 */
export function RoboreanToolbarEnd() {
  const { preferences, setPreferences } = useThemePreferences();

  return (
    <>
      <ThemeSettingsButton value={preferences} onChange={setPreferences} />
      <UserMenuButton />
    </>
  );
}
