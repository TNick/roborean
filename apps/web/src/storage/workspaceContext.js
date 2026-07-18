import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearBinding,
  createBrowserTokenProvider,
  createGoogleWorkspaceClient,
  createLiveGoogleApis,
  initializeWorkspace,
  loadBinding,
  saveBinding,
  validateBinding,
} from "@roborean/google-workspace";
import { createRoboreanClient } from "@roborean/api-types";
import { API_BASE_URL, GOOGLE_CLIENT_ID, IS_GOOGLE_MODE } from "../config.js";
const WorkspaceContext = createContext(null);
/**
 * Provide storage client and Google folder connection state.
 *
 * @param props - Provider children.
 * @returns Context provider element.
 */
export function WorkspaceProvider({ children }) {
  // Connection validation / client bootstrap state.
  const [loading, setLoading] = useState(IS_GOOGLE_MODE);
  const [binding, setBinding] = useState(null);
  const [client, setClient] = useState(
    IS_GOOGLE_MODE ? null : createRoboreanClient({ baseUrl: API_BASE_URL }),
  );
  const [error, setError] = useState(null);
  // One OAuth token provider + API suite for the whole browser session.
  const googleSession = useMemo(() => {
    if (!IS_GOOGLE_MODE || !GOOGLE_CLIENT_ID) {
      return null;
    }
    const tokens = createBrowserTokenProvider({ clientId: GOOGLE_CLIENT_ID });
    return {
      tokens,
      apis: createLiveGoogleApis({ tokens }),
    };
  }, []);
  useEffect(() => {
    if (!IS_GOOGLE_MODE) {
      return;
    }
    let cancelled = false;
    /**
     * Validate any stored binding on startup.
     */
    async function restore() {
      if (!googleSession) {
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
        const validated = await validateBinding(googleSession.apis, stored);
        if (cancelled) {
          return;
        }
        saveBinding(validated);
        setBinding(validated);
        setClient(
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
  }, [googleSession]);
  /**
   * Initialize and persist a binding for the selected folder.
   *
   * @param rootFolderId - Selected folder id.
   * @param rootFolderName - Selected folder display name.
   */
  async function connectFolder(rootFolderId, rootFolderName) {
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
      setClient(
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
   * Clear the stored binding and disconnect the client.
   */
  function disconnect() {
    clearBinding();
    setBinding(null);
    setClient(null);
    setError(null);
  }
  const value = {
    isGoogleMode: IS_GOOGLE_MODE,
    loading,
    binding,
    client,
    apis: googleSession?.apis ?? null,
    getAccessToken: googleSession
      ? () => googleSession.tokens.getAccessToken()
      : null,
    error,
    connectFolder,
    disconnect,
  };
  return _jsx(WorkspaceContext.Provider, { value: value, children: children });
}
/**
 * Read the workspace storage context.
 *
 * @returns Workspace context value.
 */
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) {
    throw new Error("useWorkspace requires WorkspaceProvider");
  }
  return value;
}
