import { useState, type MouseEvent, type ReactNode } from "react";
import PaletteIcon from "@mui/icons-material/Palette";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import type { AppearancePreferences } from "./appearancePreferences.js";
import {
  themeCategoriesWithMultipleOptions,
  themeSettingCategories,
} from "./themeSettingCategories.js";
import { ToolbarActionButton } from "./ToolbarActionButton.js";

/**
 * Props for the controlled theme settings menu button.
 */
export type ThemeSettingsButtonProps = {
  /** Current appearance preferences. */
  value: AppearancePreferences;

  /**
   * Called when the user selects a new appearance preference.
   *
   * @param next - Updated appearance preferences.
   */
  onChange: (next: AppearancePreferences) => void;

  /** Accessible label for the trigger button. */
  "aria-label"?: string;
};

/**
 * Controlled appearance menu for color, spacing, and font size presets.
 *
 * @param props - Current value and change handler.
 * @returns Theme settings toolbar button and menu.
 */
export function ThemeSettingsButton({
  value,
  onChange,
  "aria-label": ariaLabel = "Theme",
}: ThemeSettingsButtonProps) {
  // Anchor element for the settings menu.
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  /**
   * Merge one preference field and notify the host.
   *
   * @param patch - Partial appearance preference update.
   */
  function update(patch: Partial<AppearancePreferences>): void {
    onChange({ ...value, ...patch });
  }

  /**
   * Render one selectable menu row for a preference section.
   *
   * @param optionValue - Option identifier.
   * @param label - User-visible option label.
   * @param icon - Leading icon for the menu row.
   * @param selected - Whether this option is active.
   * @param onSelect - Handler when the option is chosen.
   * @returns Menu item element.
   */
  function renderOption<T extends string>(
    optionValue: T,
    label: string,
    icon: ReactNode,
    selected: boolean,
    onSelect: (next: T) => void,
  ) {
    return (
      <MenuItem
        key={optionValue}
        selected={selected}
        onClick={() => {
          onSelect(optionValue);
          setAnchorEl(null);
        }}
      >
        <ListItemIcon>{icon}</ListItemIcon>
        {label}
      </MenuItem>
    );
  }

  return (
    <>
      <ToolbarActionButton
        label="Theme"
        aria-label={ariaLabel}
        icon={<PaletteIcon fontSize="small" />}
        variant="text"
        color="inherit"
        aria-controls={open ? "theme-settings-menu" : undefined}
        aria-haspopup="menu"
        aria-expanded={open ? true : undefined}
        onClick={(event: MouseEvent<HTMLButtonElement>) =>
          setAnchorEl(event.currentTarget)
        }
      />
      <Menu
        id="theme-settings-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
      >
        {themeCategoriesWithMultipleOptions(themeSettingCategories()).map(
          (category) => (
            <span key={category.id}>
              <ListSubheader disableSticky>{category.label}</ListSubheader>
              {category.options.map((option) =>
                renderOption(
                  option.value,
                  option.label,
                  option.icon,
                  value[category.field] === option.value,
                  (next) => update({ [category.field]: next }),
                ),
              )}
            </span>
          ),
        )}
      </Menu>
    </>
  );
}
