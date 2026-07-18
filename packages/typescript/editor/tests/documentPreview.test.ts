import { describe, expect, it } from "vitest";

import {
  documentRequiresBackendPreview,
  GOOGLE_DOCS_DRIVER_ID,
  isGoogleDocsDriver,
} from "../src/utils/documentPreview.js";

describe("document preview routing", () => {
  it("treats Google Docs driver as local preview", () => {
    expect(
      documentRequiresBackendPreview({
        type: "docx",
        driver: GOOGLE_DOCS_DRIVER_ID,
      }),
    ).toBe(false);
    expect(isGoogleDocsDriver({ driver: GOOGLE_DOCS_DRIVER_ID })).toBe(true);
  });

  it("keeps backend preview for other docx drivers", () => {
    expect(
      documentRequiresBackendPreview({
        type: "docx",
        driver: "roborean.docx",
      }),
    ).toBe(true);
  });
});
