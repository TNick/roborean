import { Link as RouterLink } from "react-router-dom";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import HomeIcon from "@mui/icons-material/Home";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

/**
 * Props for a toolbar navigation control beside the page title.
 */
export interface ToolbarNavButtonProps {
  /** Destination route for the navigation control. */
  to: string;

  /** Whether the control returns home or steps back to a parent page. */
  kind: "home" | "back";
}

/**
 * Navigation control left of a page title.
 *
 * Back is always icon-only. Home shows icon+label from `lg` up.
 *
 * @param props - Destination route and navigation kind.
 * @returns Toolbar navigation button.
 */
export function ToolbarNavButton({ to, kind }: ToolbarNavButtonProps) {
  const theme = useTheme();

  // Home shows a label from lg up; back is always icon-only.
  const iconOnly =
    kind === "back" ||
    useMediaQuery(theme.breakpoints.down("lg"), { noSsr: true });

  // Label and glyph chosen from the navigation kind.
  const label = kind === "home" ? "Home" : "Back";
  const icon =
    kind === "home" ? (
      <HomeIcon fontSize="small" />
    ) : (
      <ChevronLeftIcon fontSize="small" sx={{ transform: "scale(1.45)" }} />
    );

  if (iconOnly) {
    return (
      <IconButton component={RouterLink} to={to} aria-label={label}>
        {icon}
      </IconButton>
    );
  }

  return (
    <Button
      component={RouterLink}
      to={to}
      variant="text"
      color="inherit"
      startIcon={icon}
      aria-label={label}
    >
      {label}
    </Button>
  );
}
