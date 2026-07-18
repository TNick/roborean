import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

/**
 * One selectable option with a stored value, label, and help text.
 */
export type DescribedOption<T extends string> = {
  /** Schema / API value written to the document. */
  value: T;

  /** User-facing label shown in the control. */
  label: string;

  /** Tooltip describing what the option means. */
  description: string;
};

/**
 * Props for a select menu row with an info tooltip.
 */
export type DescribedMenuItemProps = {
  /** Stored option value. */
  value: string;

  /** User-facing label. */
  label: string;

  /** Help text shown on the info icon. */
  description: string;
} & Omit<HTMLAttributes<HTMLLIElement>, "value">;

/**
 * Keep the info control from selecting or closing the select menu.
 *
 * @param event - Mouse event from the info icon.
 */
function stopMenuSelect(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Select menu item with a readable label and an info tooltip icon.
 *
 * Forwards Select-injected handlers (onClick, etc.) onto `MenuItem`.
 *
 * @param props - Value, label, description, and Select child props.
 * @returns Menu item element.
 */
export const DescribedMenuItem = forwardRef<
  HTMLLIElement,
  DescribedMenuItemProps
>(function DescribedMenuItem(
  { value, label, description, ...menuItemProps },
  ref,
): ReactNode {
  return (
    <MenuItem ref={ref} value={value} {...menuItemProps}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: 1,
        }}
      >
        <Box sx={{ flexGrow: 1 }}>{label}</Box>
        <Tooltip title={description} enterTouchDelay={0}>
          <Box
            component="span"
            role="img"
            aria-label={`About ${label}`}
            onClick={stopMenuSelect}
            onMouseDown={stopMenuSelect}
            sx={{
              display: "inline-flex",
              color: "action.active",
              cursor: "help",
            }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </Box>
        </Tooltip>
      </Box>
    </MenuItem>
  );
});

/**
 * Resolve a stored option value to its user-facing label.
 *
 * @param options - Option catalog.
 * @param value - Stored value.
 * @returns Label, or the raw value when unknown.
 */
export function describedOptionLabel<T extends string>(
  options: ReadonlyArray<DescribedOption<T>>,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
