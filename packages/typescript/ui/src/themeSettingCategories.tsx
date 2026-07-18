import type { ReactNode } from "react";
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
 * One selectable value within a theme settings category.
 */
export type ThemeSettingOption<T extends string = string> = {
  /** Stored preference value. */
  value: T;

  /** User-visible option label. */
  label: string;

  /** Leading icon for menus. */
  icon: ReactNode;
};

/**
 * One theme settings category (color, spacing, and so on).
 */
export type ThemeSettingCategory = {
  /** Stable category identifier. */
  id: string;

  /** Category label shown in menus. */
  label: string;

  /** Leading icon for the category row. */
  icon: ReactNode;

  /** Appearance preference field updated by this category. */
  field: keyof AppearancePreferences;

  /** Selectable values for the category. */
  options: ThemeSettingOption[];
};

/**
 * Return theme setting categories with their option lists.
 *
 * @returns Theme categories in menu order.
 */
export function themeSettingCategories(): ThemeSettingCategory[] {
  return [
    {
      id: "color",
      label: "Color",
      icon: <PaletteIcon fontSize="small" />,
      field: "colorMode",
      options: [
        {
          value: "white",
          label: "White",
          icon: <LightModeIcon fontSize="small" />,
        },
        {
          value: "black",
          label: "Black",
          icon: <DarkModeIcon fontSize="small" />,
        },
      ] satisfies ThemeSettingOption<ColorMode>[],
    },
    {
      id: "spacing",
      label: "Spacing",
      icon: <DensityMediumIcon fontSize="small" />,
      field: "spacing",
      options: [
        {
          value: "compact",
          label: "Compact",
          icon: <DensitySmallIcon fontSize="small" />,
        },
        {
          value: "default",
          label: "Default",
          icon: <DensityMediumIcon fontSize="small" />,
        },
        {
          value: "comfortable",
          label: "Comfortable",
          icon: <DensityLargeIcon fontSize="small" />,
        },
      ] satisfies ThemeSettingOption<SpacingPreset>[],
    },
    {
      id: "fontSize",
      label: "Font size",
      icon: <TextFieldsIcon fontSize="small" />,
      field: "fontSize",
      options: [
        {
          value: "small",
          label: "Small",
          icon: <TextDecreaseIcon fontSize="small" />,
        },
        {
          value: "medium",
          label: "Medium",
          icon: <TextFieldsIcon fontSize="small" />,
        },
        {
          value: "large",
          label: "Large",
          icon: <TextIncreaseIcon fontSize="small" />,
        },
      ] satisfies ThemeSettingOption<FontSizePreset>[],
    },
    {
      id: "fieldVariant",
      label: "Field variant",
      icon: <CheckBoxOutlineBlankIcon fontSize="small" />,
      field: "fieldVariant",
      options: [
        {
          value: "outlined",
          label: "Outlined",
          icon: <CheckBoxOutlineBlankIcon fontSize="small" />,
        },
        {
          value: "filled",
          label: "Filled",
          icon: <InputIcon fontSize="small" />,
        },
        {
          value: "standard",
          label: "Standard",
          icon: <HorizontalRuleIcon fontSize="small" />,
        },
      ] satisfies ThemeSettingOption<FieldVariant>[],
    },
  ];
}

/**
 * Keep only categories that offer more than one selectable value.
 *
 * @param categories - Full theme category list.
 * @returns Categories with multiple options.
 */
export function themeCategoriesWithMultipleOptions(
  categories: ThemeSettingCategory[],
): ThemeSettingCategory[] {
  return categories.filter((category) => category.options.length > 1);
}
