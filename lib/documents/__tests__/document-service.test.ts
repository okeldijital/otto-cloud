/**
 * Milestone 2.1B — Platform DocumentService unit tests (no live R2).
 * Run: npx tsx lib/documents/__tests__/document-service.test.ts
 */
import assert from "node:assert/strict";
import { createHash } from "crypto";
import { extractExtension, sha256 } from "../checksum";
import {
  CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
  CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
  DOCUMENT_MAX_SIZE_BYTES,
} from "../constants";
import type {
  StorageObjectMetadata,
  StorageObjectRef,
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
} from "../types/storage";
import { DocumentService } from "../services/document-service";
import { DocumentServiceError } from "../types/errors";
import { validateDocumentUpload } from "../validation/upload-validation";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${e.message}`);
    }
  })();
}

/** In-memory StorageProvider for isolation tests. */
class MemoryStorageProvider implements StorageProvider {
  readonly name = "memory";
  private objects = new Map<string, { body: Buffer; mimeType: string }>();

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    this.objects.set(params.key, { body: params.body, mimeType: params.mimeType });
    return {
      key: params.key,
      bucket: "test-bucket",
      region: "auto",
      provider: this.name,
      etag: `"${sha256(params.body).slice(0, 8)}"`,
    };
  }

  async download(ref: StorageObjectRef): Promise<Buffer> {
    const obj = this.objects.get(ref.key);
    if (!obj) throw new Error("not found");
    return obj.body;
  }

  async delete(ref: StorageObjectRef): Promise<void> {
    this.objects.delete(ref.key);
  }

  async exists(ref: StorageObjectRef): Promise<boolean> {
    return this.objects.has(ref.key);
  }

  async metadata(ref: StorageObjectRef): Promise<StorageObjectMetadata> {
    const obj = this.objects.get(ref.key);
    if (!obj) throw new Error("not found");
    return {
      key: ref.key,
      bucket: "test-bucket",
      contentType: obj.mimeType,
      contentLength: obj.body.byteLength,
    };
  }

  async signedUrl(ref: StorageObjectRef): Promise<string> {
    return `memory://signed/${ref.key}`;
  }
}

async function main() {
  console.log("\nDocument Service / M2.1B platform tests\n");

  await test("sha256 produces stable hex digest", () => {
    const buf = Buffer.from("hello otto");
    const a = sha256(buf);
    const b = createHash("sha256").update(buf).digest("hex");
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  await test("extractExtension handles PDF names", () => {
    assert.equal(extractExtension("Agreement.PDF"), ".pdf");
    assert.equal(extractExtension("noext"), null);
  });

  await test("validateDocumentUpload accepts contract PDF policy", () => {
    validateDocumentUpload({
      fileName: "a.pdf",
      mimeType: "application/pdf",
      body: Buffer.from("%PDF"),
      allowedMimeTypes: CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
      allowedExtensions: CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
    });
  });

  await test("validateDocumentUpload rejects empty file", () => {
    assert.throws(
      () =>
        validateDocumentUpload({
          fileName: "a.pdf",
          mimeType: "application/pdf",
          body: Buffer.alloc(0),
          allowedMimeTypes: CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
          allowedExtensions: CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
        }),
      (err: unknown) => {
        assert.ok(err instanceof DocumentServiceError);
        assert.equal(err.code, "VALIDATION_FAILED");
        return true;
      }
    );
  });

  await test("validateDocumentUpload rejects non-PDF under contract policy", () => {
    assert.throws(
      () =>
        validateDocumentUpload({
          fileName: "note.txt",
          mimeType: "text/plain",
          body: Buffer.from("x"),
          allowedMimeTypes: CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
          allowedExtensions: CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
        }),
      (err: unknown) => err instanceof DocumentServiceError
    );
  });

  await test("validateDocumentUpload rejects oversized file", () => {
    assert.throws(
      () =>
        validateDocumentUpload({
          fileName: "big.pdf",
          mimeType: "application/pdf",
          body: Buffer.alloc(DOCUMENT_MAX_SIZE_BYTES + 1, 1),
          allowedMimeTypes: CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
          allowedExtensions: CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
          maxSizeBytes: DOCUMENT_MAX_SIZE_BYTES,
        }),
      (err: unknown) => err instanceof DocumentServiceError
    );
  });

  await test("MemoryStorageProvider round-trip", async () => {
    const storage = new MemoryStorageProvider();
    const body = Buffer.from("%PDF-1.4 test");
    const up = await storage.upload({
      key: "organizations/org/documents/a.pdf",
      body,
      mimeType: "application/pdf",
    });
    assert.equal(up.provider, "memory");
    assert.equal(await storage.exists({ key: up.key }), true);
    assert.deepEqual(await storage.download({ key: up.key }), body);
  });

  await test("DocumentService has no contract-named public methods", () => {
    const service = new DocumentService(new MemoryStorageProvider());
    const proto = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
    assert.ok(proto.includes("uploadDocument"));
    assert.ok(proto.includes("softDeleteDocument"));
    assert.ok(!proto.includes("uploadForContract"));
    assert.ok(!proto.includes("listForContract"));
    assert.ok(!proto.includes("softDeleteForContract"));
  });

  await test("toMetadata never exposes storageKey", () => {
    const service = new DocumentService(new MemoryStorageProvider());
    const dto = service.toMetadata({
      id: "11111111-1111-1111-1111-111111111111",
      organizationId: "00000000-0000-0000-0000-000000000001",
      storageKey: "secret/key.pdf",
      storageProvider: "cloudflare-r2",
      storageBucket: "bucket",
      storageRegion: "auto",
      originalFilename: "Agreement.pdf",
      extension: ".pdf",
      mimeType: "application/pdf",
      fileSize: BigInt(12),
      checksum: "abc",
      uploadedBy: 1,
      uploadedAt: new Date("2026-07-28T00:00:00Z"),
      deletedAt: null,
      createdAt: new Date("2026-07-28T00:00:00Z"),
      updatedAt: new Date("2026-07-28T00:00:00Z"),
    });
    assert.equal(dto.originalFilename, "Agreement.pdf");
    assert.equal((dto as any).storageKey, undefined);
    assert.equal((dto as any).storageBucket, undefined);
  });

  await test("DocumentService validation rejects empty via uploadDocument path", async () => {
    const service = new DocumentService(new MemoryStorageProvider());
    await assert.rejects(
      () =>
        service.uploadDocument({
          organizationId: "00000000-0000-0000-0000-000000000001",
          userId: 1,
          fileName: "x.pdf",
          mimeType: "application/pdf",
          body: Buffer.alloc(0),
          allowedMimeTypes: CONTRACT_DOCUMENT_ALLOWED_MIME_TYPES,
          allowedExtensions: CONTRACT_DOCUMENT_ALLOWED_EXTENSIONS,
        }),
      (err: unknown) => {
        assert.ok(err instanceof DocumentServiceError);
        assert.equal(err.code, "VALIDATION_FAILED");
        return true;
      }
    );
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
