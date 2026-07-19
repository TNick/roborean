import {
  DrivePicker,
  DrivePickerDocsView,
} from "@googleworkspace/drive-picker-react";
import { createRoot } from "react-dom/client";

/** Default maximum time to wait for a Google Picker response. */
export const DEFAULT_PICKER_TIMEOUT_MS = 60_000;

/** Supported temporary Picker views. */
export type PickerKind = "folder" | "google-document";

/** A document selected through Google Picker. */
export type PickerSelection = {
  id: string;
  name: string;
  webViewLink?: string;
};

/** Configuration for a temporary Picker React tree. */
export type OpenGooglePickerOptions = {
  kind: PickerKind;
  oauthToken: string;
  developerKey: string;
  appId?: string;
  origin: string;
  timeoutMs?: number;
  onDiagnostic?: (stage: string, details?: Record<string, unknown>) => void;
};

/** Picker response shape used by the official custom element events. */
type PickerResponse = {
  docs?: Array<{ id?: string; name?: string; url?: string }>;
};

/** Render the correct restricted list view. */
function PickerView({ kind }: { kind: PickerKind }) {
  if (kind === "folder") {
    return (
      <DrivePickerDocsView
        view-id="FOLDERS"
        include-folders="true"
        select-folder-enabled="true"
        mode="LIST"
      />
    );
  }

  return (
    <DrivePickerDocsView
      view-id="DOCS"
      include-folders="false"
      select-folder-enabled="false"
      mime-types="application/vnd.google-apps.document"
      mode="LIST"
    />
  );
}

/** Return only safe fields from an opaque Google Picker error event. */
function redactPickerErrorDetail(detail: unknown): Record<string, unknown> {
  if (!detail || typeof detail !== "object") {
    return { type: typeof detail };
  }
  const record = detail as Record<string, unknown>;
  const safeKeys = ["action", "code", "error", "message", "status"];
  return Object.fromEntries(
    safeKeys
      .filter(
        (key) =>
          typeof record[key] === "string" || typeof record[key] === "number",
      )
      .map((key) => [key, record[key]]),
  );
}

/** Open the official React Picker wrapper through an imperative Promise API. */
export function openGooglePickerWithReact(
  options: OpenGooglePickerOptions,
): Promise<PickerSelection> {
  return new Promise((resolve, reject) => {
    // Create an isolated React host that exists only for this Picker session.
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let settled = false;
    let timeoutId: number | undefined;
    let observer: MutationObserver | undefined;

    /** Settle once and asynchronously dispose the temporary React tree. */
    function settle(
      outcome:
        | { type: "resolve"; value: PickerSelection }
        | { type: "reject"; error: Error },
    ): void {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      observer?.disconnect();
      if (outcome.type === "resolve") {
        resolve(outcome.value);
      } else {
        reject(outcome.error);
      }
      queueMicrotask(() => {
        root.unmount();
        host.remove();
      });
    }

    /** Convert a Picker picked event to the public selection shape. */
    function picked(response: PickerResponse): void {
      const document = response.docs?.[0];
      if (!document?.id) {
        settle({
          type: "reject",
          error: new Error("Google Picker returned no document id"),
        });
        return;
      }
      settle({
        type: "resolve",
        value: {
          id: document.id,
          name:
            document.name ??
            (options.kind === "folder"
              ? "Roborean folder"
              : "Google Doc template"),
          webViewLink: document.url,
        },
      });
    }

    // The React wrapper does not expose picker-error. Observe the temporary
    // host because React may commit after a microtask, then subscribe exactly
    // once to the official custom element's native error event.
    function attachPickerErrorHandler(): boolean {
      const picker = host.querySelector("drive-picker");
      if (!picker || picker.dataset.roboreanErrorHandler === "true") {
        return Boolean(picker);
      }
      picker.dataset.roboreanErrorHandler = "true";
      picker.addEventListener("picker-error", (event) => {
        const detail = (event as CustomEvent<unknown>).detail;
        options.onDiagnostic?.("picker reported an error", {
          errorDetail: redactPickerErrorDetail(detail),
        });
        settle({
          type: "reject",
          error: new Error(
            "Google Picker reported an error; check the browser Network panel for the failing picker request",
          ),
        });
      });
      options.onDiagnostic?.("official picker mounted", {
        documentBaseUri: document.baseURI,
        pageHref: window.location.href,
      });
      return true;
    }

    observer = new MutationObserver(() => {
      if (attachPickerErrorHandler()) {
        observer?.disconnect();
      }
    });
    observer.observe(host, { childList: true, subtree: true });
    attachPickerErrorHandler();

    timeoutId = window.setTimeout(() => {
      options.onDiagnostic?.("picker timed out", {
        timeoutMs: options.timeoutMs ?? DEFAULT_PICKER_TIMEOUT_MS,
      });
      settle({
        type: "reject",
        error: new Error("Google Picker did not complete within 60 seconds"),
      });
    }, options.timeoutMs ?? DEFAULT_PICKER_TIMEOUT_MS);

    root.render(
      <DrivePicker
        app-id={options.appId}
        developer-key={options.developerKey}
        oauth-token={options.oauthToken}
        origin={options.origin}
        onPicked={(event) => picked(event.detail as PickerResponse)}
        onCanceled={() =>
          settle({
            type: "reject",
            error: new Error(
              options.kind === "folder"
                ? "Folder selection cancelled"
                : "Document selection cancelled",
            ),
          })
        }
        onOauthError={() =>
          settle({
            type: "reject",
            error: new Error("Google Picker OAuth failed"),
          })
        }
      >
        <PickerView kind={options.kind} />
      </DrivePicker>,
    );
  });
}
