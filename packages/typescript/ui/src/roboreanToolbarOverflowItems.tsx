import { useMemo } from "react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import type { AppearancePreferences } from "./appearancePreferences.js";
import {
  themeCategoriesWithMultipleOptions,
  themeSettingCategories,
} from "./themeSettingCategories.js";
import type { ToolbarOverflowMenuItem } from "./ToolbarOverflowMenu.js";
import { useThemePreferences } from "./ThemePreferencesProvider.js";

/**
 * Theme and account rows for compact toolbar overflow menus.
 */
export type RoboreanToolbarOverflowGroups = {
  /** Theme category rows with left-opening submenus. */
  themeItems: ToolbarOverflowMenuItem[];

  /** Account row(s) shown after a divider. */
  accountItems: ToolbarOverflowMenuItem[];
};

/**
 * Build integrated theme and account rows for a toolbar overflow menu.
 *
 * Theme categories with multiple options open a submenu to the left; public
 * access is a single disabled status row separated by a divider.
 *
 * @param preferences - Current appearance preferences.
 * @param setPreferences - Preference update handler.
 * @returns Grouped overflow menu rows for Roborean global chrome.
 */
export function buildRoboreanToolbarOverflowItems(
  preferences: AppearancePreferences,
  setPreferences: (next: AppearancePreferences) => void,
): RoboreanToolbarOverflowGroups {
  const themeItems: ToolbarOverflowMenuItem[] = [];

  for (const category of themeCategoriesWithMultipleOptions(
    themeSettingCategories(),
  )) {
    themeItems.push({
      id: `theme-${category.id}`,
      label: category.label,
      icon: category.icon,
      submenu: category.options.map((option) => ({
        id: `${category.id}-${option.value}`,
        label: option.label,
        icon: option.icon,
        selected: preferences[category.field] === option.value,
        onClick: () =>
          setPreferences({
            ...preferences,
            [category.field]: option.value,
          } as AppearancePreferences),
      })),
    });
  }

  const accountItems: ToolbarOverflowMenuItem[] = [
    {
      id: "account",
      label: "Public access",
      icon: <AccountCircleIcon fontSize="small" />,
      disabled: true,
    },
  ];

  return { themeItems, accountItems };
}

/**
 * Hook returning integrated theme and account overflow menu rows.
 *
 * @returns Roborean global chrome row groups for compact toolbars.
 */
export function useRoboreanToolbarOverflowItems(): RoboreanToolbarOverflowGroups {
  const { preferences, setPreferences } = useThemePreferences();

  return useMemo(
    () => buildRoboreanToolbarOverflowItems(preferences, setPreferences),
    [preferences, setPreferences],
  );
}
