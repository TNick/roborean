import { useState, type MouseEvent, type ReactNode } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

/**
 * One selectable row inside a toolbar overflow submenu.
 */
export type ToolbarOverflowSubmenuOption = {
  /** Stable option identifier. */
  id: string;

  /** User-visible option label. */
  label: string;

  /** Optional leading icon. */
  icon?: ReactNode;

  /** Whether this option is currently active. */
  selected?: boolean;

  /** Called when the option is chosen. */
  onClick: () => void;
};

/**
 * One actionable row in a toolbar overflow menu.
 */
export type ToolbarOverflowMenuItem = {
  /** Stable row identifier. */
  id: string;

  /** Visible menu row label. */
  label: string;

  /** Leading icon for the menu row. */
  icon: ReactNode;

  /**
   * Called when the row is chosen.
   *
   * @param event - Click event from the menu item.
   */
  onClick?: (event: MouseEvent<HTMLElement>) => void;

  /** Disable the row. */
  disabled?: boolean;

  /** Optional submenu options opened to the left of the main menu. */
  submenu?: ToolbarOverflowSubmenuOption[];
};

/**
 * Props for the toolbar overflow menu trigger.
 */
export type ToolbarOverflowMenuProps = {
  /** Primary action rows shown above optional trailing rows. */
  items: ToolbarOverflowMenuItem[];

  /** Optional trailing rows separated by a divider (theme categories, etc.). */
  trailingItems?: ToolbarOverflowMenuItem[];

  /** Optional footer rows after a second divider (account, etc.). */
  footerItems?: ToolbarOverflowMenuItem[];

  /** Accessible label for the overflow trigger. */
  "aria-label"?: string;
};

/**
 * Overflow menu for compact toolbars: `MoreVert` trigger with icon rows and
 * optional trailing rows. Submenu categories open to the left.
 *
 * @param props - Menu items and optional trailing rows.
 * @returns Overflow menu trigger and panel.
 */
export function ToolbarOverflowMenu({
  items,
  trailingItems = [],
  footerItems = [],
  "aria-label": ariaLabel = "More actions",
}: ToolbarOverflowMenuProps) {
  // Anchor element for the overflow menu.
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Anchor and item for an open submenu panel.
  const [submenu, setSubmenu] = useState<{
    anchor: HTMLElement;
    item: ToolbarOverflowMenuItem;
  } | null>(null);

  const open = Boolean(anchorEl);

  /**
   * Close the overflow menu and any open submenu.
   */
  function closeMenu(): void {
    setAnchorEl(null);
    setSubmenu(null);
  }

  /**
   * Render one overflow menu row.
   *
   * @param item - Row definition.
   * @returns Menu item element.
   */
  function renderMenuItem(item: ToolbarOverflowMenuItem): ReactNode {
    const hasSubmenu = Boolean(item.submenu?.length);

    return (
      <MenuItem
        key={item.id}
        disabled={item.disabled}
        selected={hasSubmenu ? Boolean(submenu?.item.id === item.id) : false}
        onClick={(event: MouseEvent<HTMLElement>) => {
          if (hasSubmenu) {
            event.stopPropagation();
            setSubmenu({ anchor: event.currentTarget, item });
            return;
          }

          item.onClick?.(event);
          if (!item.disabled) {
            closeMenu();
          }
        }}
      >
        <ListItemIcon>{item.icon}</ListItemIcon>
        {item.label}
        {hasSubmenu ? (
          <ChevronLeftIcon fontSize="small" sx={{ ml: "auto" }} />
        ) : null}
      </MenuItem>
    );
  }

  return (
    <>
      <IconButton
        aria-label={ariaLabel}
        aria-controls={open ? "toolbar-overflow-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? true : undefined}
        onClick={(event: MouseEvent<HTMLButtonElement>) =>
          setAnchorEl(event.currentTarget)
        }
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        id="toolbar-overflow-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
      >
        {items.map((item) => renderMenuItem(item))}
        {trailingItems.length > 0 ? (
          <>
            {items.length > 0 ? <Divider /> : null}
            {trailingItems.map((item) => renderMenuItem(item))}
          </>
        ) : null}
        {footerItems.length > 0 ? (
          <>
            {items.length > 0 || trailingItems.length > 0 ? <Divider /> : null}
            {footerItems.map((item) => renderMenuItem(item))}
          </>
        ) : null}
      </Menu>
      <Menu
        anchorEl={submenu?.anchor ?? null}
        open={Boolean(submenu)}
        onClose={() => setSubmenu(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {submenu?.item.submenu?.map((option) => (
          <MenuItem
            key={option.id}
            selected={option.selected}
            onClick={() => {
              option.onClick();
              closeMenu();
            }}
          >
            {option.icon ? <ListItemIcon>{option.icon}</ListItemIcon> : null}
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
