import { useState, type MouseEvent, type ReactNode } from "react";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DensityLargeIcon from "@mui/icons-material/DensityLarge";
import DensityMediumIcon from "@mui/icons-material/DensityMedium";
import DensitySmallIcon from "@mui/icons-material/DensitySmall";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import InputIcon from "@mui/icons-material/Input";
import LightModeIcon from "@mui/icons-material/LightMode";
import PaletteIcon from "@mui/icons-material/Palette";
import TextDecreaseIcon from "@mui/icons-material/TextDecrease";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import TextIncreaseIcon from "@mui/icons-material/TextIncrease";
import type {
  AppearancePreferences,
  ColorMode,
  FieldVariant,
  FontSizePreset,
  SpacingPreset,
} from "./appearancePreferences.js";

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
 * @returns Theme settings icon button and menu.
 */
export function ThemeSettingsButton({
  value,
  onChange,
  "aria-label": ariaLabel = "Theme settings",
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
      <IconButton
        aria-label={ariaLabel}
        aria-controls={open ? "theme-settings-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={(event: MouseEvent<HTMLButtonElement>) =>
          setAnchorEl(event.currentTarget)
        }
      >
        <PaletteIcon fontSize="small" />
      </IconButton>
      <Menu
        id="theme-settings-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
      >
        <ListSubheader disableSticky>Color</ListSubheader>
        {renderOption<ColorMode>(
          "white",
          "White",
          <LightModeIcon fontSize="small" />,
          value.colorMode === "white",
          (next) => update({ colorMode: next }),
        )}
        {renderOption<ColorMode>(
          "black",
          "Black",
          <DarkModeIcon fontSize="small" />,
          value.colorMode === "black",
          (next) => update({ colorMode: next }),
        )}
        <ListSubheader disableSticky>Spacing</ListSubheader>
        {renderOption<SpacingPreset>(
          "compact",
          "Compact",
          <DensitySmallIcon fontSize="small" />,
          value.spacing === "compact",
          (next) => update({ spacing: next }),
        )}
        {renderOption<SpacingPreset>(
          "default",
          "Default",
          <DensityMediumIcon fontSize="small" />,
          value.spacing === "default",
          (next) => update({ spacing: next }),
        )}
        {renderOption<SpacingPreset>(
          "comfortable",
          "Comfortable",
          <DensityLargeIcon fontSize="small" />,
          value.spacing === "comfortable",
          (next) => update({ spacing: next }),
        )}
        <ListSubheader disableSticky>Font size</ListSubheader>
        {renderOption<FontSizePreset>(
          "small",
          "Small",
          <TextDecreaseIcon fontSize="small" />,
          value.fontSize === "small",
          (next) => update({ fontSize: next }),
        )}
        {renderOption<FontSizePreset>(
          "medium",
          "Medium",
          <TextFieldsIcon fontSize="small" />,
          value.fontSize === "medium",
          (next) => update({ fontSize: next }),
        )}
        {renderOption<FontSizePreset>(
          "large",
          "Large",
          <TextIncreaseIcon fontSize="small" />,
          value.fontSize === "large",
          (next) => update({ fontSize: next }),
        )}
        <ListSubheader disableSticky>Field variant</ListSubheader>
        {renderOption<FieldVariant>(
          "outlined",
          "Outlined",
          <CheckBoxOutlineBlankIcon fontSize="small" />,
          value.fieldVariant === "outlined",
          (next) => update({ fieldVariant: next }),
        )}
        {renderOption<FieldVariant>(
          "filled",
          "Filled",
          <InputIcon fontSize="small" />,
          value.fieldVariant === "filled",
          (next) => update({ fieldVariant: next }),
        )}
        {renderOption<FieldVariant>(
          "standard",
          "Standard",
          <HorizontalRuleIcon fontSize="small" />,
          value.fieldVariant === "standard",
          (next) => update({ fieldVariant: next }),
        )}
      </Menu>
    </>
  );
}
