import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { applyMarkdownOps } from "@roborean/documents-markdown";
import { applyTextOps } from "@roborean/documents-text";
import {
  normalizePreviewBody,
  type PreviewFixtureFile,
  renderPreviewFromFixture,
} from "../src/conformancePreview.js";

const root = resolve(import.meta.dirname, "../../../../");
const documentsDir = resolve(root, "conformance/documents");
const expectedDir = resolve(root, "conformance/expected/documents");

const fixture = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));

/**
 * List D01–D06 document conformance package directory names.
 *
 * @returns Sorted package folder names with a ``project.json`` file.
 */
function documentPackages(): string[] {
  return readdirSync(documentsDir)
    .filter((name) => /^D0[1-6]_/.test(name))
    .filter((entry) => {
      try {
        readFileSync(resolve(documentsDir, entry, "project.json"));
        return true;
      } catch {
        return false;
      }
    })
    .sort();
}

describe("document conformance preview parity (D01–D06)", () => {
  for (const packageName of documentPackages()) {
    it(`matches preview goldens for ${packageName}`, () => {
      const previews = fixture(
        `conformance/expected/documents/${packageName}/expected.previews.json`,
      ) as Record<string, unknown>;
      const fixtures = fixture(
        `conformance/expected/documents/${packageName}/expected.preview-fixtures.json`,
      ) as PreviewFixtureFile;

      for (const [documentId, expectedPreview] of Object.entries(previews)) {
        const entry = fixtures.documents[documentId];
        expect(
          entry,
          `missing preview fixture for ${documentId}`,
        ).toBeDefined();
        const actual = normalizePreviewBody(renderPreviewFromFixture(entry));
        const { renderer: _ignored, ...expectedBody } = expectedPreview as {
          renderer?: unknown;
          documentId: string;
          mode: string;
          body: unknown;
          warnings: unknown;
        };
        expect(actual).toEqual(expectedBody);
      }
    });

    it(`matches browser-safe artifact bytes for ${packageName}`, () => {
      const manifest = fixture(
        `conformance/expected/documents/${packageName}/expected.artifacts.json`,
      ) as {
        artifacts: Array<{
          documentId: string;
          path: string;
          compare?: string;
          mediaType: string;
        }>;
      };
      const fixtures = fixture(
        `conformance/expected/documents/${packageName}/expected.preview-fixtures.json`,
      ) as PreviewFixtureFile;

      for (const entry of manifest.artifacts) {
        if (entry.compare === "skip") {
          continue;
        }
        if (
          entry.mediaType !== "text/plain" &&
          entry.mediaType !== "text/markdown"
        ) {
          continue;
        }
        const docFixture = fixtures.documents[entry.documentId];
        expect(docFixture).toBeDefined();
        const golden = readFileSync(
          resolve(expectedDir, packageName, "artifacts", entry.path),
        );
        let actual: Buffer;
        if (entry.mediaType === "text/plain") {
          actual = Buffer.from(
            applyTextOps(docFixture.templateText ?? "", docFixture.ops),
            "utf8",
          );
        } else {
          actual = Buffer.from(
            applyMarkdownOps(docFixture.templateText ?? "", docFixture.ops),
            "utf8",
          );
        }
        expect(actual.equals(golden)).toBe(true);
      }
    });
  }
});
