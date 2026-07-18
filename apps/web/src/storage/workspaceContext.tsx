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
  type GoogleApis,
  type GoogleWorkspaceClient,
  type WorkspaceBinding,
} from "@roborean/google-workspace";
import { createRoboreanClient } from "@roborean/api-types";
import {
  API_BASE_URL,
  GOOGLE_CLIENT_ID,
  IS_API_AVAILABLE,
  IS_GOOGLE_AVAILABLE,
  IS_GOOGLE_ONLY,
  type StorageSource,
} from "../config.js";

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
   * True when the build is Google-only (no FastAPI).
   */
  isGoogleMode: boolean;

  /**
   * True when FastAPI storage is available.
   */
  isApiAvailable: boolean;

  /**
   * True when Google OAuth is configured (Drive can be connected).
   */
  isGoogleAvailable: boolean;

  /**
   * True when a Drive folder must be selected before the app is usable.
   */
  googleRequired: boolean;

  /**
   * True while connection validation is in progress.
   */
  loading: boolean;

  /**
   * Active Drive/Sheets binding when connected.
   */
  binding: WorkspaceBinding | null;

  /**
   * FastAPI client when API storage is enabled.
   */
  apiClient: AppStorageClient | null;

  /**
   * Google Workspace client when a Drive folder is connected.
   */
  googleClient: AppStorageClient | null;

  /**
   * Convenience client for single-backend builds.
   *
   * Prefer `clientFor` when both backends may be active.
   */
  client: AppStorageClient | null;

  /**
   * Return the client for a storage source, or null when unavailable.
   *
   * @param source - Backend to resolve.
   * @returns Matching client, or null.
   */
  clientFor: (source: StorageSource) => AppStorageClient | null;

  /**
   * Shared Google API clients for the browser session, when configured.
   */
  apis: GoogleApis | null;

  /**
   * Return a usable OAuth access token from the shared session provider.
   *
   * @returns Access token string.
   */
  getAccessToken: (() => Promise<string>) | null;

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
   * Disconnect Drive and clear the stored binding.
   *
   * Does not affect the FastAPI client when API storage is enabled.
   */
  disconnect: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Provide storage clients and optional Google folder connection state.
 *
 * @param props - Provider children.
 * @returns Context provider element.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Connection validation / Google client bootstrap state.
  const [loading, setLoading] = useState(IS_GOOGLE_AVAILABLE);
  const [binding, setBinding] = useState<WorkspaceBinding | null>(null);
  const [googleClient, setGoogleClient] = useState<AppStorageClient | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // FastAPI client is available for the whole session in non-Pages builds.
  const apiClient = useMemo(() => {
    if (!IS_API_AVAILABLE) {
      return null;
    }
    return createRoboreanClient({ baseUrl: API_BASE_URL });
  }, []);

  // One OAuth token provider + API suite when Google is configured.
  const googleSession = useMemo(() => {
    if (!IS_GOOGLE_AVAILABLE || !GOOGLE_CLIENT_ID) {
      return null;
    }
    const tokens = createBrowserTokenProvider({ clientId: GOOGLE_CLIENT_ID });
    return {
      tokens,
      apis: createLiveGoogleApis({ tokens }),
    };
  }, []);

  useEffect(() => {
    if (!IS_GOOGLE_AVAILABLE) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    /**
     * Validate any stored binding on startup.
     */
    async function restore(): Promise<void> {
      if (!googleSession) {
        setError("VITE_GOOGLE_CLIENT_ID is required for Google Workspace");
        setLoading(false);
        return;
      }

      const stored = loadBinding();
      if (!stored) {
        setLoading(false);
        return;
      }

      try {
        const validated = await validateBinding(googleSession.apis, stored);
        if (cancelled) {
          return;
        }
        saveBinding(validated);
        setBinding(validated);
        setGoogleClient(
          createGoogleWorkspaceClient({
            apis: googleSession.apis,
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
        setGoogleClient(null);
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
  }, [googleSession]);

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
    if (!googleSession) {
      throw new Error("Google APIs are unavailable");
    }
    setLoading(true);
    setError(null);
    try {
      const next = await initializeWorkspace(
        googleSession.apis,
        rootFolderId,
        rootFolderName,
      );
      saveBinding(next);
      setBinding(next);
      setGoogleClient(
        createGoogleWorkspaceClient({
          apis: googleSession.apis,
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
   * Clear the stored Drive binding without dropping the API client.
   */
  function disconnect(): void {
    clearBinding();
    setBinding(null);
    setGoogleClient(null);
    setError(null);
  }

  /**
   * Resolve the client for a storage source.
   *
   * @param source - Backend to resolve.
   * @returns Matching client, or null.
   */
  function clientFor(source: StorageSource): AppStorageClient | null {
    if (source === "api") {
      return apiClient;
    }
    return googleClient;
  }

  // Single-backend convenience: prefer API when present, else Google.
  const client = apiClient ?? googleClient;

  const value: WorkspaceContextValue = {
    isGoogleMode: IS_GOOGLE_ONLY,
    isApiAvailable: IS_API_AVAILABLE,
    isGoogleAvailable: IS_GOOGLE_AVAILABLE,
    googleRequired: IS_GOOGLE_ONLY,
    loading,
    binding,
    apiClient,
    googleClient,
    client,
    clientFor,
    apis: googleSession?.apis ?? null,
    getAccessToken: googleSession
      ? () => googleSession.tokens.getAccessToken()
      : null,
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
