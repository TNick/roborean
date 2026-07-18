import {
  jsxs as _jsxs,
  jsx as _jsx,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AppToolbar, RoboreanToolbarEnd } from "@roborean/ui";
import { IS_GOOGLE_MODE } from "../config.js";
import { useWorkspace } from "../storage/workspaceContext.js";
/**
 * Parse API run results into a display-friendly shape when possible.
 *
 * @param raw - Redacted results object from the API.
 * @returns Parsed results or null.
 */
function parseRunResults(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw;
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
  const { runId = "" } = useParams();
  const { client } = useWorkspace();
  // Loaded run record from the active storage client.
  const [run, setRun] = useState(null);
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
  async function download(documentId) {
    if (!client) {
      return;
    }
    const blob = await client.downloadArtifact(runId, documentId);
    const text = await blob.text();
    // Google Workspace artifacts are Docs URLs; open them directly.
    if (IS_GOOGLE_MODE && text.startsWith("http")) {
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
  return _jsxs(_Fragment, {
    children: [
      _jsxs(AppToolbar, {
        endActions: _jsx(RoboreanToolbarEnd, {}),
        children: [
          _jsxs(Typography, {
            variant: "h6",
            component: "h1",
            children: ["Run ", runId],
          }),
          _jsx(Button, {
            component: RouterLink,
            to: "/projects",
            variant: "outlined",
            children: "Back to projects",
          }),
        ],
      }),
      _jsxs(Stack, {
        sx: { p: 3 },
        spacing: 2,
        children: [
          _jsxs(Typography, {
            variant: "body2",
            children: ["Status: ", run?.status ?? "loading"],
          }),
          run?.error
            ? _jsxs(Typography, {
                variant: "body2",
                color: "error",
                children: ["Error: ", JSON.stringify(run.error)],
              })
            : null,
          results
            ? _jsxs(Stack, {
                spacing: 2,
                children: [
                  _jsx(Typography, {
                    variant: "subtitle2",
                    children: "Bit results",
                  }),
                  results.bitResults.map((bit) =>
                    _jsxs(
                      Stack,
                      {
                        spacing: 0.5,
                        sx: { pl: 1 },
                        children: [
                          _jsxs(Typography, {
                            variant: "body2",
                            children: [
                              bit.bitId,
                              " \u00B7 ",
                              bit.status,
                              " \u00B7 active=",
                              String(bit.active),
                            ],
                          }),
                          bit.diagnostics.length > 0
                            ? _jsx(Typography, {
                                variant: "caption",
                                component: "div",
                                children: bit.diagnostics.map((item) =>
                                  _jsxs(
                                    "div",
                                    {
                                      children: [
                                        item.severity,
                                        ": ",
                                        item.code,
                                        " \u2014 ",
                                        item.message,
                                      ],
                                    },
                                    `${item.code}-${item.message}`,
                                  ),
                                ),
                              })
                            : null,
                          bit.workspacePatch.ops.length > 0
                            ? _jsx(Typography, {
                                component: "pre",
                                variant: "caption",
                                children: JSON.stringify(
                                  bit.workspacePatch,
                                  null,
                                  2,
                                ),
                              })
                            : null,
                        ],
                      },
                      bit.bitId,
                    ),
                  ),
                  _jsx(Typography, {
                    variant: "subtitle2",
                    children: "Artifacts",
                  }),
                  results.artifacts.length === 0
                    ? _jsx(Typography, {
                        variant: "body2",
                        children: "No artifacts",
                      })
                    : results.artifacts.map((artifact) =>
                        _jsxs(
                          Stack,
                          {
                            direction: "row",
                            spacing: 1,
                            alignItems: "center",
                            children: [
                              _jsxs(Typography, {
                                variant: "body2",
                                children: [
                                  artifact.path,
                                  " (",
                                  artifact.mediaType,
                                  ")",
                                ],
                              }),
                              _jsx(Button, {
                                size: "small",
                                variant: "outlined",
                                onClick: () =>
                                  void download(artifact.documentId),
                                children: IS_GOOGLE_MODE
                                  ? "Open Doc"
                                  : "Download",
                              }),
                              !IS_GOOGLE_MODE && client
                                ? _jsx(Link, {
                                    href: client.artifactDownloadUrl(
                                      runId,
                                      artifact.documentId,
                                    ),
                                    variant: "body2",
                                    target: "_blank",
                                    rel: "noreferrer",
                                    children: "Open",
                                  })
                                : null,
                            ],
                          },
                          artifact.documentId,
                        ),
                      ),
                ],
              })
            : run?.results
              ? _jsx(Typography, {
                  component: "pre",
                  variant: "body2",
                  children: JSON.stringify(run.results, null, 2),
                })
              : null,
        ],
      }),
    ],
  });
}
