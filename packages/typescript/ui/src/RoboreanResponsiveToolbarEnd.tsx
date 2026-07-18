import { RoboreanToolbarEnd } from "./RoboreanToolbarEnd.js";
import { ToolbarOverflowMenu } from "./ToolbarOverflowMenu.js";
import type { ToolbarOverflowMenuItem } from "./ToolbarOverflowMenu.js";
import { useRoboreanToolbarOverflowItems } from "./roboreanToolbarOverflowItems.js";
import { useCompactToolbarLayout } from "./useCompactToolbarLayout.js";

/**
 * Props for responsive global toolbar actions.
 */
export type RoboreanResponsiveToolbarEndProps = {
  /**
   * Page-specific rows shown above theme and account in the compact
   * overflow menu.
   */
  items?: ToolbarOverflowMenuItem[];
};

/**
 * Global toolbar end slot that switches between separate theme and account
 * controls and a single overflow menu below `md`.
 *
 * @param props - Optional page-specific overflow rows for compact layout.
 * @returns Toolbar end controls for the current viewport.
 */
export function RoboreanResponsiveToolbarEnd({
  items = [],
}: RoboreanResponsiveToolbarEndProps) {
  const compactLayout = useCompactToolbarLayout();
  const { themeItems, accountItems } = useRoboreanToolbarOverflowItems();

  if (compactLayout) {
    return (
      <ToolbarOverflowMenu
        items={items}
        trailingItems={themeItems}
        footerItems={accountItems}
      />
    );
  }

  return <RoboreanToolbarEnd />;
}
