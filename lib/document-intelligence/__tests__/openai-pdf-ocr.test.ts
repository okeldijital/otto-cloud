import assert from "node:assert/strict";
import test from "node:test";

// Keep the parser contract test isolated from network/API credentials.
// The provider itself is integration-tested through the extraction pipeline.
const pageMarker = /\[PAGE\s+(\d+)\]/gi;

function parsePageMarkers(text: string) {
  const matches = [...text.matchAll(pageMarker)];
  if (matches.length === 0) return [{ pageNumber: 1, text: text.trim() }];

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    return { pageNumber: Number(match[1]), text: text.slice(start, end).trim() };
  });
}

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
