import assert from "node:assert/strict";
import test from "node:test";
import { parsePageMarkers } from "../providers/openai-pdf-ocr";

test("parses OCR page markers into page-level text", () => {
  const pages = parsePageMarkers("[PAGE 1]\nParty A\n[PAGE 2]\nRoyalty: 50%");

  assert.deepEqual(pages, [
    { pageNumber: 1, text: "Party A" },
    { pageNumber: 2, text: "Royalty: 50%" },
  ]);
});

test("treats unmarked OCR output as a single page", () => {
  assert.deepEqual(parsePageMarkers("Contract text"), [
    { pageNumber: 1, text: "Contract text" },
  ]);
});
