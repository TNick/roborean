import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ThemePreferencesProvider } from "@roborean/ui";
import { AppRoutes } from "./routes.js";
import { FolderGateDialog } from "./storage/FolderGateDialog.js";
import { WorkspaceProvider } from "./storage/workspaceContext.js";
/**
 * Root application shell with theme and storage providers.
 *
 * @returns App element.
 */
export function App() {
  return _jsx(ThemePreferencesProvider, {
    children: _jsxs(WorkspaceProvider, {
      children: [_jsx(FolderGateDialog, {}), _jsx(AppRoutes, {})],
    }),
  });
}
