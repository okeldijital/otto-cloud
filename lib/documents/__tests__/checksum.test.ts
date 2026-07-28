/**
 * Checksum / metadata extraction unit tests.
 * Run: npx tsx lib/documents/__tests__/checksum.test.ts
 */
import assert from "node:assert/strict";
import { extractExtension, sha256 } from "../checksum";

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

console.log("\nChecksum tests\n");

test("empty buffer has known sha256", () => {
  assert.equal(
    sha256(Buffer.alloc(0)),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});

test("different content different checksum", () => {
  assert.notEqual(sha256(Buffer.from("a")), sha256(Buffer.from("b")));
});

test("extension extraction edge cases", () => {
  assert.equal(extractExtension("a.b.c.PDF"), ".pdf");
  assert.equal(extractExtension(""), null);
  assert.equal(extractExtension("file."), null);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
