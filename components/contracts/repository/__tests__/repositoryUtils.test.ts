/**
 * Repository UI pure logic tests (M2.2).
 * Run: npx tsx components/contracts/repository/__tests__/repositoryUtils.test.ts
 */
import assert from "node:assert/strict";
import {
  filterDocuments,
  friendlyUploadError,
  mimeLabel,
  paginate,
  sortDocuments,
} from "../repositoryUtils";
import type { RepositoryDocument } from "../types";
import { DEFAULT_FILTERS } from "../types";

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

function doc(
  partial: Partial<RepositoryDocument["document"]> & { originalFilename: string }
): RepositoryDocument {
  return {
    relationshipId: `rel-${partial.originalFilename}`,
    relationshipType: "signed_agreement",
    linkedAt: partial.uploadedAt || "2026-01-01T00:00:00Z",
    linkedBy: 1,
    document: {
      id: `id-${partial.originalFilename}`,
      originalFilename: partial.originalFilename,
      extension: partial.extension ?? ".pdf",
      mimeType: partial.mimeType ?? "application/pdf",
      fileSize: partial.fileSize ?? 1000,
      checksum: partial.checksum ?? "abc",
      uploadedBy: partial.uploadedBy ?? 1,
      uploadedByName: partial.uploadedByName,
      uploadedAt: partial.uploadedAt ?? "2026-01-01T00:00:00Z",
      deletedAt: partial.deletedAt ?? null,
      status: partial.status ?? "active",
      storageProvider: "cloudflare-r2",
    },
  };
}

const sample = [
  doc({
    originalFilename: "Alpha.pdf",
    fileSize: 100,
    uploadedAt: "2026-03-01T00:00:00Z",
    uploadedByName: "Ada",
    status: "active",
  }),
  doc({
    originalFilename: "Beta.pdf",
    fileSize: 500,
    uploadedAt: "2026-01-01T00:00:00Z",
    uploadedByName: "Bob",
    status: "deleted",
    deletedAt: "2026-02-01T00:00:00Z",
  }),
  doc({
    originalFilename: "Gamma Agreement.pdf",
    fileSize: 250,
    uploadedAt: "2026-02-15T00:00:00Z",
    uploadedBy: 9,
    status: "active",
  }),
];

console.log("\nRepository utils (M2.2)\n");

test("mimeLabel maps PDF", () => {
  assert.equal(mimeLabel("application/pdf", ".pdf"), "PDF");
});

test("filter by filename", () => {
  const out = filterDocuments(sample, { ...DEFAULT_FILTERS, filename: "gamma" });
  assert.equal(out.length, 1);
  assert.equal(out[0].document.originalFilename, "Gamma Agreement.pdf");
});

test("filter by status deleted", () => {
  const out = filterDocuments(sample, { ...DEFAULT_FILTERS, status: "deleted" });
  assert.equal(out.length, 1);
  assert.equal(out[0].document.originalFilename, "Beta.pdf");
});

test("filter by status active (default)", () => {
  const out = filterDocuments(sample, DEFAULT_FILTERS);
  assert.equal(out.length, 2);
});

test("filter by type pdf", () => {
  const out = filterDocuments(sample, {
    ...DEFAULT_FILTERS,
    status: "all",
    type: "pdf",
  });
  assert.equal(out.length, 3);
});

test("filter by uploadedBy name", () => {
  const out = filterDocuments(sample, {
    ...DEFAULT_FILTERS,
    status: "all",
    uploadedBy: "bob",
  });
  assert.equal(out.length, 1);
});

test("sort newest", () => {
  const out = sortDocuments(sample, "newest");
  assert.equal(out[0].document.originalFilename, "Alpha.pdf");
});

test("sort name_asc", () => {
  const out = sortDocuments(sample, "name_asc");
  assert.equal(out[0].document.originalFilename, "Alpha.pdf");
  assert.equal(out[2].document.originalFilename, "Gamma Agreement.pdf");
});

test("sort size_desc", () => {
  const out = sortDocuments(sample, "size_desc");
  assert.equal(out[0].document.fileSize, 500);
});

test("paginate", () => {
  const page1 = paginate(sample, 1, 2);
  assert.equal(page1.length, 2);
  const page2 = paginate(sample, 2, 2);
  assert.equal(page2.length, 1);
});

test("friendlyUploadError validation size", () => {
  const msg = friendlyUploadError({
    response: {
      status: 400,
      data: { code: "VALIDATION_FAILED", errors: ["File size exceeds maximum"] },
    },
  });
  assert.match(msg, /Maximum size/i);
});

test("friendlyUploadError permission", () => {
  assert.match(
    friendlyUploadError({ response: { status: 403 } }),
    /Permission denied/i
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
