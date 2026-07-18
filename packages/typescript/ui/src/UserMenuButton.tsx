import { useState, type MouseEvent } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

/**
 * Props for the stub user menu button.
 */
export type UserMenuButtonProps = {
  /** Accessible label for the trigger button. */
  "aria-label"?: string;
};

/**
 * Stub user account menu for hosts that have not wired auth yet.
 *
 * @param props - Optional accessibility label.
 * @returns User menu icon button and placeholder menu.
 */
export function UserMenuButton({
  "aria-label": ariaLabel = "User menu",
}: UserMenuButtonProps) {
  // Anchor element for the user menu.
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton
        aria-label={ariaLabel}
        aria-controls={open ? "user-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        onClick={(event: MouseEvent<HTMLButtonElement>) =>
          setAnchorEl(event.currentTarget)
        }
      >
        <AccountCircleIcon fontSize="small" />
      </IconButton>
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem disabled>Account — coming soon</MenuItem>
      </Menu>
    </>
  );
}
