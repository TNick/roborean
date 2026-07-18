import type { MouseEvent, ReactNode } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/**
 * Props for a responsive toolbar action control.
 */
export type ToolbarActionButtonProps = {
  /** Visible label on wide viewports; also the default accessible name. */
  label: string;

  /** Leading icon shown on wide viewports and alone on narrow ones. */
  icon: ReactNode;

  /**
   * Called when the control is activated.
   *
   * @param event - Click event from the underlying button.
   */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;

  /** Disable the control. */
  disabled?: boolean;

  /** Button variant used on wide viewports. */
  variant?: "text" | "outlined" | "contained";

  /** Button color used on wide viewports. */
  color?:
    | "inherit"
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "info"
    | "warning";

  /** Accessible name override (defaults to `label`). */
  "aria-label"?: string;

  /** Optional menu trigger wiring. */
  "aria-controls"?: string;

  /** Optional menu trigger wiring. */
  "aria-haspopup"?: boolean | "menu" | "listbox" | "tree" | "grid" | "dialog";

  /** Optional menu trigger wiring. */
  "aria-expanded"?: boolean | "true" | "false";

  /** Optional test id forwarded to the control. */
  "data-testid"?: string;
};

/**
 * Toolbar action that shows icon+label on wide screens and icon-only from
 * the `lg` breakpoint down. Compact editor layout uses a separate `md`
 * breakpoint.
 *
 * @param props - Label, icon, and button behavior.
 * @returns Responsive toolbar button element.
 */
export function ToolbarActionButton({
  label,
  icon,
  onClick,
  disabled = false,
  variant = "outlined",
  color = "primary",
  "aria-label": ariaLabel = label,
  "aria-controls": ariaControls,
  "aria-haspopup": ariaHaspopup,
  "aria-expanded": ariaExpanded,
  "data-testid": dataTestId,
}: ToolbarActionButtonProps) {
  const theme = useTheme();

  // Icon-only from lg down; compact editor layout switches separately at md.
  const iconOnly = useMediaQuery(theme.breakpoints.down("lg"), {
    noSsr: true,
  });

  if (iconOnly) {
    return (
      <IconButton
        aria-label={ariaLabel}
        aria-controls={ariaControls}
        aria-haspopup={ariaHaspopup}
        aria-expanded={ariaExpanded}
        color={color === "primary" ? "default" : color}
        disabled={disabled}
        onClick={onClick}
        data-testid={dataTestId}
      >
        {icon}
      </IconButton>
    );
  }

  return (
    <Button
      variant={variant}
      color={color}
      startIcon={icon}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-controls={ariaControls}
      aria-haspopup={ariaHaspopup}
      aria-expanded={ariaExpanded}
      data-testid={dataTestId}
    >
      {label}
    </Button>
  );
}
