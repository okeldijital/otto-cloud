/**
 * PDF viewer error mapping / messaging tests (M2.3).
 * Run: npx tsx components/documents/pdf/__tests__/pdfError.test.ts
 */
import assert from "node:assert/strict";
import { friendlyPdfError, type PdfErrorCode } from "../types";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log("\nPDF viewer helpers (M2.3)\n");

const codes: PdfErrorCode[] = [
  "permission",
  "expired",
  "invalid",
  "network",
  "unavailable",
  "unknown",
];

for (const code of codes) {
  test(`friendlyPdfError(${code}) is non-empty and has no stack traces`, () => {
    const msg = friendlyPdfError(code);
    assert.ok(msg.length > 10);
    assert.ok(!msg.includes("Error:"));
    assert.ok(!msg.toLowerCase().includes("stack"));
  });
}

test("friendlyPdfError unknown uses fallback", () => {
  assert.equal(friendlyPdfError("unknown", "Custom"), "Custom");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
