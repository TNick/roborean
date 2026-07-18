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
  return (
    <ThemePreferencesProvider>
      <WorkspaceProvider>
        <FolderGateDialog />
        <AppRoutes />
      </WorkspaceProvider>
    </ThemePreferencesProvider>
  );
}
