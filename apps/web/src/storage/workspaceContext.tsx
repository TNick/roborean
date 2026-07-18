import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearBinding,
  createBrowserTokenProvider,
  createGoogleWorkspaceClient,
  createLiveGoogleApis,
  initializeWorkspace,
  loadBinding,
  saveBinding,
  validateBinding,
  type GoogleWorkspaceClient,
  type WorkspaceBinding,
} from "@roborean/google-workspace";
import { createRoboreanClient } from "@roborean/api-types";
import { API_BASE_URL, GOOGLE_CLIENT_ID, IS_GOOGLE_MODE } from "../config.js";

/**
 * Shared storage client surface used by pages and the editor.
 */
export type AppStorageClient =
  ReturnType<typeof createRoboreanClient> | GoogleWorkspaceClient;

/**
 * Google Workspace connection state for the web shell.
 */
export type WorkspaceContextValue = {
  /**
   * True when the app is in browser Google Workspace mode.
   */
  isGoogleMode: boolean;

  /**
   * True while connection validation is in progress.
   */
  loading: boolean;

  /**
   * Active Drive/Sheets binding when connected.
   */
  binding: WorkspaceBinding | null;

  /**
   * Storage client used by pages, or null until connected in Google mode.
   */
  client: AppStorageClient | null;

  /**
   * Last connection error message.
   */
  error: string | null;

  /**
   * Connect to a user-selected Drive folder.
   *
   * @param rootFolderId - Selected folder id.
   * @param rootFolderName - Selected folder display name.
   */
  connectFolder: (
    rootFolderId: string,
    rootFolderName: string,
  ) => Promise<void>;

  /**
   * Disconnect and clear the stored binding.
   */
  disconnect: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Provide storage client and Google folder connection state.
 *
 * @param props - Provider children.
 * @returns Context provider element.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Connection validation / client bootstrap state.
  const [loading, setLoading] = useState(IS_GOOGLE_MODE);
  const [binding, setBinding] = useState<WorkspaceBinding | null>(null);
  const [client, setClient] = useState<AppStorageClient | null>(
    IS_GOOGLE_MODE ? null : createRoboreanClient({ baseUrl: API_BASE_URL }),
  );
  const [error, setError] = useState<string | null>(null);

  // Live Google API suite is created lazily after a client id is present.
  const googleApis = useMemo(() => {
    if (!IS_GOOGLE_MODE || !GOOGLE_CLIENT_ID) {
      return null;
    }
    const tokens = createBrowserTokenProvider({ clientId: GOOGLE_CLIENT_ID });
    return createLiveGoogleApis({ tokens });
  }, []);

  useEffect(() => {
    if (!IS_GOOGLE_MODE) {
      return;
    }

    let cancelled = false;

    /**
     * Validate any stored binding on startup.
     */
    async function restore(): Promise<void> {
      if (!googleApis) {
        setError("VITE_GOOGLE_CLIENT_ID is required for Google Workspace mode");
        setLoading(false);
        return;
      }

      const stored = loadBinding();
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const validated = await validateBinding(googleApis, stored);
        if (cancelled) {
          return;
        }
        saveBinding(validated);
        setBinding(validated);
        setClient(
          createGoogleWorkspaceClient({
            apis: googleApis,
            binding: validated,
          }),
        );
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        clearBinding();
        setBinding(null);
        setClient(null);
        setError(
          err instanceof Error
            ? err.message
            : "Stored Google Drive folder is unavailable",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [googleApis]);

  /**
   * Initialize and persist a binding for the selected folder.
   *
   * @param rootFolderId - Selected folder id.
   * @param rootFolderName - Selected folder display name.
   */
  async function connectFolder(
    rootFolderId: string,
    rootFolderName: string,
  ): Promise<void> {
    if (!googleApis) {
      throw new Error("Google APIs are unavailable");
    }
    setLoading(true);
    setError(null);
    try {
      const next = await initializeWorkspace(
        googleApis,
        rootFolderId,
        rootFolderName,
      );
      saveBinding(next);
      setBinding(next);
      setClient(
        createGoogleWorkspaceClient({
          apis: googleApis,
          binding: next,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect Drive folder",
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }

  /**
   * Clear the stored binding and disconnect the client.
   */
  function disconnect(): void {
    clearBinding();
    setBinding(null);
    setClient(null);
    setError(null);
  }

  const value: WorkspaceContextValue = {
    isGoogleMode: IS_GOOGLE_MODE,
    loading,
    binding,
    client,
    error,
    connectFolder,
    disconnect,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Read the workspace storage context.
 *
 * @returns Workspace context value.
 */
export function useWorkspace(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace requires WorkspaceProvider");
  }
  return value;
}
