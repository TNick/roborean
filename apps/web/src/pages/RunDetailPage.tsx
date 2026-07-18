import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { RunDetail } from "@roborean/api-types";
import {
  AppToolbar,
  AppToolbarTitle,
  RoboreanResponsiveToolbarEnd,
} from "@roborean/ui";
import { ToolbarNavButton } from "../components/ToolbarNavButton.js";
import { PageShell } from "../components/PageShell.js";
import { isStorageSource, type StorageSource } from "../config.js";
import { useWorkspace } from "../storage/workspaceContext.js";

type BitResultView = {
  bitId: string;
  status: string;
  active: boolean;
  diagnostics: Array<{ severity: string; code: string; message: string }>;
  workspacePatch: { ops: unknown[] };
};

type RunResultsView = {
  bitResults: BitResultView[];
  artifacts: Array<{
    documentId: string;
    path: string;
    mediaType: string;
    webViewLink?: string;
  }>;
};

/**
 * Parse API run results into a display-friendly shape when possible.
 *
 * @param raw - Redacted results object from the API.
 * @returns Parsed results or null.
 */
function parseRunResults(raw: unknown): RunResultsView | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as RunResultsView;
  if (!Array.isArray(candidate.bitResults)) {
    return null;
  }
  return candidate;
}

/**
 * Run detail page with bit diagnostics, patches, and artifact downloads.
 *
 * @returns Run detail page element.
 */
export function RunDetailPage() {
  const { source: sourceParam = "", runId = "" } = useParams();
  const { clientFor } = useWorkspace();

  // Parsed storage source from the route, when valid.
  const source: StorageSource | null = isStorageSource(sourceParam)
    ? sourceParam
    : null;

  // Client for the run’s backend.
  const client = source ? clientFor(source) : null;

  // Whether artifacts are Drive Docs links rather than file downloads.
  const isGoogleSource = source === "google";

  // Loaded run record from the active storage client.
  const [run, setRun] = useState<RunDetail | null>(null);

  useEffect(() => {
    if (!client) {
      setRun(null);
      return;
    }
    client
      .getRun(runId)
      .then(setRun)
      .catch(() => setRun(null));
  }, [runId, client]);

  const results = parseRunResults(run?.results);

  /**
   * Download one artifact through the storage client.
   *
   * @param documentId - Artifact document id.
   */
  async function download(documentId: string): Promise<void> {
    if (!client) {
      return;
    }
    const blob = await client.downloadArtifact(runId, documentId);
    const text = await blob.text();

    // Google Workspace artifacts are Docs URLs; open them directly.
    if (isGoogleSource && text.startsWith("http")) {
      window.open(text, "_blank", "noopener,noreferrer");
      return;
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = documentId;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageShell>
      <AppToolbar
        startActions={<ToolbarNavButton kind="back" to="/projects" />}
        endActions={<RoboreanResponsiveToolbarEnd />}
      >
        <AppToolbarTitle>Run {runId}</AppToolbarTitle>
      </AppToolbar>
      <Stack spacing={2}>
        <Typography variant="body2">
          Status: {run?.status ?? "loading"}
        </Typography>
        {run?.error ? (
          <Typography variant="body2" color="error">
            Error: {JSON.stringify(run.error)}
          </Typography>
        ) : null}
        {results ? (
          <Stack spacing={2}>
            <Typography variant="subtitle2">Bit results</Typography>
            {results.bitResults.map((bit) => (
              <Stack key={bit.bitId} spacing={0.5} sx={{ pl: 1 }}>
                <Typography variant="body2">
                  {bit.bitId} · {bit.status} · active={String(bit.active)}
                </Typography>
                {bit.diagnostics.length > 0 ? (
                  <Typography variant="caption" component="div">
                    {bit.diagnostics.map((item) => (
                      <div key={`${item.code}-${item.message}`}>
                        {item.severity}: {item.code} — {item.message}
                      </div>
                    ))}
                  </Typography>
                ) : null}
                {bit.workspacePatch.ops.length > 0 ? (
                  <Typography component="pre" variant="caption">
                    {JSON.stringify(bit.workspacePatch, null, 2)}
                  </Typography>
                ) : null}
              </Stack>
            ))}
            <Typography variant="subtitle2">Artifacts</Typography>
            {results.artifacts.length === 0 ? (
              <Typography variant="body2">No artifacts</Typography>
            ) : (
              results.artifacts.map((artifact) => (
                <Stack
                  key={artifact.documentId}
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Typography variant="body2">
                    {artifact.documentId}
                    {artifact.mediaType ? ` (${artifact.mediaType})` : ""}
                  </Typography>
                  {isGoogleSource && artifact.webViewLink ? (
                    <Link
                      href={artifact.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      variant="body2"
                    >
                      Open in Google Docs
                    </Link>
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => void download(artifact.documentId)}
                    >
                      Download
                    </Button>
                  )}
                  {!isGoogleSource && client ? (
                    <Link
                      href={client.artifactDownloadUrl(
                        runId,
                        artifact.documentId,
                      )}
                      variant="body2"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </Link>
                  ) : null}
                </Stack>
              ))
            )}
          </Stack>
        ) : run?.results ? (
          <Typography component="pre" variant="body2">
            {JSON.stringify(run.results, null, 2)}
          </Typography>
        ) : null}
      </Stack>
    </PageShell>
  );
}
