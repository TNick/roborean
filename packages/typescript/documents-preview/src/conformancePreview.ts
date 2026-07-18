import type {
  DocumentOperation,
  DocumentPreview,
} from "@roborean/documents-base";
import { applyMarkdownOps } from "@roborean/documents-markdown";
import { applyTextOps } from "@roborean/documents-text";

/** One document entry from ``expected.preview-fixtures.json``. */
export type PreviewFixtureDocument = {
  definition: { id: string; type: string; driver: string };
  ops: DocumentOperation[];
  templateText?: string;
  paragraphTexts?: string[];
  sheetRows?: Record<string, string[][]>;
  imageSize?: number[];
};

/** Preview fixture file shape written by Python document conformance. */
export type PreviewFixtureFile = {
  documents: Record<string, PreviewFixtureDocument>;
};

/** Strip volatile preview fields before golden comparison. */
export function normalizePreviewBody(
  preview: DocumentPreview,
): Omit<DocumentPreview, "generatedAt" | "renderer"> {
  return {
    documentId: preview.documentId,
    mode: preview.mode,
    body: preview.body,
    warnings: preview.warnings,
  };
}

/** Build drawing-json entities from drawing document operations. */
export function drawingEntitiesFromOps(
  ops: DocumentOperation[],
): Array<Record<string, unknown>> {
  const entities: Array<Record<string, unknown>> = [];

  for (const op of ops) {
    if (op.op === "drawing.ensure_layer") {
      entities.push({ type: "layer", name: String(op.name) });
    } else if (op.op === "drawing.insert_polyline") {
      entities.push({
        type: "polyline",
        layer: op.layer,
        points: op.points,
      });
    } else if (op.op === "drawing.insert_text") {
      entities.push({
        type: "text",
        layer: op.layer,
        at: op.at,
        text: op.text,
        height: op.height ?? 2.5,
      });
    }
  }

  return entities;
}

/** Build raster preview metadata from image operations. */
export function rasterPreviewBodyFromOps(
  ops: DocumentOperation[],
  imageSize: number[],
): { size: number[]; texts: Array<{ text: string; anchor: number[] }> } {
  const texts: Array<{ text: string; anchor: number[] }> = [];

  for (const op of ops) {
    if (op.op === "raster.draw_text") {
      texts.push({
        text: String(op.text),
        anchor: op.anchor as number[],
      });
    }
  }

  return { size: imageSize, texts };
}

/** Render simplified xlsx HTML matching the Python driver preview. */
export function buildXlsxPreviewHtml(
  sheetRows: Record<string, string[][]>,
): string {
  const parts = ['<div class="roborean-xlsx">'];

  for (const [name, rows] of Object.entries(sheetRows)) {
    parts.push(`<h3>${name}</h3><table>`);
    for (const row of rows.slice(0, 50)) {
      const cells = row
        .map((cell) => `<td>${cell === "" ? "" : cell}</td>`)
        .join("");
      parts.push(`<tr>${cells}</tr>`);
    }
    parts.push("</table>");
  }

  parts.push("</div>");
  return parts.join("");
}

/** Render docx HTML from paragraph text matching the Python driver preview. */
export function buildDocxPreviewHtml(paragraphTexts: string[]): string {
  const parts = ['<div class="roborean-docx">'];

  for (const text of paragraphTexts) {
    parts.push(`<p>${text}</p>`);
  }

  parts.push("</div>");
  return parts.join("");
}

/**
 * Render a document preview from a conformance preview fixture entry.
 *
 * @param fixture - One document block from ``expected.preview-fixtures.json``.
 * @returns Preview payload without timestamps (caller compares normalized body).
 */
export function renderPreviewFromFixture(
  fixture: PreviewFixtureDocument,
): DocumentPreview {
  const definition = fixture.definition;
  const ops = fixture.ops;

  if (definition.type === "text" || definition.driver === "roborean.text") {
    const body = applyTextOps(fixture.templateText ?? "", ops);
    return {
      documentId: definition.id,
      mode: "text",
      body,
      warnings: [],
      generatedAt: "",
      renderer: { package: "@roborean/documents-text", version: "0.3.0" },
    };
  }

  if (
    definition.type === "markdown" ||
    definition.driver === "roborean.markdown"
  ) {
    const body = applyMarkdownOps(fixture.templateText ?? "", ops);
    return {
      documentId: definition.id,
      mode: "text",
      body,
      warnings: [],
      generatedAt: "",
      renderer: {
        package: "@roborean/documents-markdown",
        version: "0.3.0",
      },
    };
  }

  if (definition.type === "xlsx" && fixture.sheetRows) {
    return {
      documentId: definition.id,
      mode: "html",
      body: buildXlsxPreviewHtml(fixture.sheetRows),
      warnings: [],
      generatedAt: "",
      renderer: { package: "@roborean/documents-preview", version: "0.3.0" },
    };
  }

  if (definition.type === "docx" && fixture.paragraphTexts) {
    return {
      documentId: definition.id,
      mode: "html",
      body: buildDocxPreviewHtml(fixture.paragraphTexts),
      warnings: [],
      generatedAt: "",
      renderer: { package: "@roborean/documents-preview", version: "0.3.0" },
    };
  }

  if (definition.type === "dxf") {
    return {
      documentId: definition.id,
      mode: "drawing-json",
      body: { entities: drawingEntitiesFromOps(ops) },
      warnings: [],
      generatedAt: "",
      renderer: { package: "@roborean/documents-preview", version: "0.3.0" },
    };
  }

  if (definition.type === "image" && fixture.imageSize) {
    return {
      documentId: definition.id,
      mode: "drawing-json",
      body: rasterPreviewBodyFromOps(ops, fixture.imageSize),
      warnings: [],
      generatedAt: "",
      renderer: { package: "@roborean/documents-preview", version: "0.3.0" },
    };
  }

  throw new Error(
    `Unsupported preview fixture for ${definition.id} (${definition.type})`,
  );
}
