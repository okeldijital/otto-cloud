#!/usr/bin/env tsx

/**
 * M2KR release artwork recovery.
 *
 * Dry-run is the default. --execute is required for R2/DB writes.
 * Release-to-file mapping comes only from releases.cover_art_url.
 * The migration is deterministic and idempotent.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

import {
  detectMimeCategory,
  generateStorageKey,
  sanitizeFilename,
  storageClient,
  storageConfig,
  uploadFile,
} from "@/lib/storage";

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = "6e3b659b-f14e-484e-8ee4-a020cd4c502a";
const IMAGE_EXTENSIONS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
};

type Release = { id: number; title: string | null; cover_art_url: string | null };
type PlanItem = Release & {
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  storageKey: string;
};

function args() {
  const values = process.argv.slice(2);
  let assets = "";
  let execute = false;
  let orgId = process.env.OTTO_M2KR_ORG_ID || DEFAULT_ORG_ID;
  let actorUserId = process.env.OTTO_MIGRATION_ACTOR_USER_ID
    ? Number(process.env.OTTO_MIGRATION_ACTOR_USER_ID)
    : undefined;

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === "--assets") assets = path.resolve(values[++i] || "");
    else if (value === "--execute") execute = true;
    else if (value === "--dry-run") execute = false;
    else if (value === "--org-id") orgId = values[++i] || orgId;
    else if (value === "--actor-user-id") actorUserId = Number(values[++i]);
    else if (value === "--help" || value === "-h") {
      console.log("npx tsx scripts/migrate-m2kr-release-artwork.ts --assets <directory|zip> [--dry-run|--execute] [--org-id <uuid>] [--actor-user-id <id>]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${value}`);
  }

  if (!assets) throw new Error("--assets <directory|zip> is required");
  if (execute && (!Number.isInteger(actorUserId) || actorUserId! <= 0)) {
    throw new Error("--actor-user-id or OTTO_MIGRATION_ACTOR_USER_ID is required for --execute");
  }
  return { assets, execute, orgId, actorUserId: actorUserId! };
}

function resolveAssets(input: string): { root: string; cleanup?: () => void } {
  const stat = fs.statSync(input);
  if (stat.isDirectory()) return { root: input };
  if (!stat.isFile() || path.extname(input).toLowerCase() !== ".zip") {
    throw new Error("--assets must point to a directory or .zip archive");
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "otto-m2kr-assets-"));
  try {
    execFileSync("unzip", ["-q", input, "-d", root], { stdio: "inherit" });
  } catch (error) {
    fs.rmSync(root, { recursive: true, force: true });
    throw new Error(`Failed to extract archive: ${String(error)}`);
  }
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

function collectImages(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__MACOSX" || entry.name === ".DS_Store") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && IMAGE_EXTENSIONS[path.extname(entry.name).toLowerCase()]) {
        if (files.has(entry.name)) throw new Error(`Duplicate artwork filename: ${entry.name}`);
        files.set(entry.name, full);
      }
    }
  };
  walk(root);
  return files;
}

function coverFilename(ref: string | null): string | null {
  if (!ref) return null;
  const clean = ref.split("?")[0].trim();
  if (!clean.startsWith("assets/")) return null;
  const filename = path.basename(clean);
  return filename && filename !== "." ? filename : null;
}

function sha256(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function storageKey(orgId: string, releaseId: number, fileName: string): string {
  const hex = createHash("sha256").update(`otto-m2kr-release-artwork:${releaseId}`).digest("hex").slice(0, 32);
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return generateStorageKey({ organizationId: orgId, folder: "releases", fileName: sanitizeFilename(fileName), uuid });
}

async function releases(orgId: string): Promise<Release[]> {
  return prisma.$queryRaw<Release[]>`
    SELECT id, title, cover_art_url
    FROM releases
    WHERE organization_id = ${orgId}::uuid AND cover_art_url IS NOT NULL
    ORDER BY id
  `;
}

/**
 * uploadedBy stores the legacy user id. The M2KR owner is represented by an
 * IAM identity/membership, so users.organization_id is deliberately not used
 * as the organization authorization test here.
 */
async function validateActor(orgId: string, actorUserId: number): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{
    user_id: number;
    email: string | null;
    identity_id: string;
    identity_status: string;
    membership_id: string;
    membership_status: string;
  }>>`
    SELECT
      u.id AS user_id,
      u.email,
      i.id AS identity_id,
      i.status AS identity_status,
      m.id AS membership_id,
      m.status AS membership_status
    FROM users u
    JOIN iam_identities i ON i."legacyUserId" = u.id
    JOIN iam_organization_memberships m
      ON m."identityId" = i.id
     AND m."organizationId" = ${orgId}::uuid
    WHERE u.id = ${actorUserId}
      AND i.status = 'active'
      AND m.status = 'active'
      AND m."removedAt" IS NULL
      AND m."suspendedAt" IS NULL
    LIMIT 1
  `;
  if (!rows[0]) {
    throw new Error(`Actor user ${actorUserId} has no active IAM membership in organization ${orgId}`);
  }
  console.log(`[preflight] actor=${rows[0].user_id} (${rows[0].email ?? "no email"}) IAM membership=${rows[0].membership_id}`);
}

async function plan(orgId: string, files: Map<string, string>): Promise<PlanItem[]> {
  const rows = await releases(orgId);
  const planned: PlanItem[] = [];
  const missing: string[] = [];

  for (const release of rows) {
    const fileName = coverFilename(release.cover_art_url);
    if (!fileName || !files.has(fileName)) {
      missing.push(`release ${release.id}: ${fileName ?? release.cover_art_url ?? "invalid ref"}`);
      continue;
    }
    const filePath = files.get(fileName)!;
    const mimeType = IMAGE_EXTENSIONS[path.extname(fileName).toLowerCase()];
    planned.push({
      ...release,
      filePath,
      fileName,
      mimeType,
      fileSize: fs.statSync(filePath).size,
      sha256: sha256(filePath),
      storageKey: storageKey(orgId, release.id, fileName),
    });
  }

  if (missing.length) throw new Error(`Missing/invalid artwork mappings:\n${missing.join("\n")}`);
  if (files.size !== rows.length || planned.length !== rows.length) {
    throw new Error(`One-to-one preflight failed: files=${files.size}, releases=${rows.length}, mapped=${planned.length}`);
  }
  return planned;
}

async function objectExists(key: string) {
  try {
    const head = await storageClient.send(new HeadObjectCommand({ Bucket: storageConfig.bucket, Key: key }));
    return { exists: true, size: Number(head.ContentLength ?? 0), etag: head.ETag ?? null };
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") return { exists: false };
    throw error;
  }
}

async function execute(orgId: string, actorUserId: number, items: PlanItem[]) {
  let uploaded = 0;
  let created = 0;
  let skipped = 0;

  for (const item of items) {
    if (item.fileSize > storageConfig.maxUploadSize) throw new Error(`Artwork too large: release ${item.id}`);

    const object = await objectExists(item.storageKey);
    let etag = object.etag;
    if (object.exists) {
      if (object.size !== item.fileSize) throw new Error(`R2 size mismatch for release ${item.id}`);
      skipped += 1;
    } else {
      const result = await uploadFile({
        body: fs.readFileSync(item.filePath),
        organizationId: orgId,
        folder: "releases",
        fileName: item.fileName,
        mimeType: item.mimeType,
        key: item.storageKey,
        metadata: { releaseId: String(item.id), source: "m2kr-artwork-recovery", sha256: item.sha256 },
      });
      etag = result.etag;
      uploaded += 1;
    }

    const existing = await prisma.attachment.findFirst({
      where: { organizationId: orgId, entityType: "release", entityId: String(item.id), category: "image" },
      orderBy: { version: "desc" },
    });

    if (existing?.storageKey === item.storageKey && existing.fileSize === item.fileSize) {
      console.log(`[execute] release ${item.id}: already current`);
      continue;
    }

    const data = {
      organizationId: orgId,
      entityType: "release",
      entityId: String(item.id),
      fileName: sanitizeFilename(item.fileName),
      originalName: item.fileName,
      mimeType: item.mimeType,
      category: detectMimeCategory(item.mimeType),
      fileSize: item.fileSize,
      bucket: storageConfig.bucket,
      storageKey: item.storageKey,
      checksum: etag ?? null,
      version: existing ? existing.version + 1 : 1,
      uploadedBy: String(actorUserId),
    };

    if (existing) await prisma.attachment.update({ where: { id: existing.id }, data });
    else await prisma.attachment.create({ data });
    created += existing ? 0 : 1;
    console.log(`[execute] release ${item.id}: attachment ${existing ? "updated" : "created"}`);
  }

  return { uploaded, created, skipped };
}

async function verify(orgId: string, items: PlanItem[]): Promise<void> {
  const failures: string[] = [];
  for (const item of items) {
    const attachment = await prisma.attachment.findFirst({
      where: { organizationId: orgId, entityType: "release", entityId: String(item.id), category: "image" },
      orderBy: { version: "desc" },
    });
    if (!attachment || attachment.storageKey !== item.storageKey || attachment.fileSize !== item.fileSize) {
      failures.push(`release ${item.id}: attachment mismatch`);
      continue;
    }
    const object = await objectExists(item.storageKey);
    if (!object.exists || object.size !== item.fileSize) failures.push(`release ${item.id}: R2 object mismatch`);
  }
  if (failures.length) throw new Error(`Verification failed:\n${failures.join("\n")}`);
}

async function main() {
  const { assets, execute: shouldExecute, orgId, actorUserId } = args();
  console.log(`[m2kr] mode=${shouldExecute ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`[m2kr] org=${orgId}`);
  const resolved = resolveAssets(assets);
  try {
    const files = collectImages(resolved.root);
    const items = await plan(orgId, files);
    const rows = await releases(orgId);
    console.log(`[preflight] canonical images=${files.size}`);
    console.log(`[preflight] releases=${rows.length}`);
    console.log(`[preflight] mapped=${items.length}`);

    if (!shouldExecute) {
      console.log("[m2kr] Dry-run passed. No R2 or database writes were performed.");
      return;
    }

    await validateActor(orgId, actorUserId);
    console.log("[m2kr] EXECUTE: writing R2 objects and release attachments.");
    const result = await execute(orgId, actorUserId, items);
    await verify(orgId, items);
    console.log("[m2kr] Migration and verification completed successfully.");
    console.log(JSON.stringify({ ...result, verified: items.length }, null, 2));
  } finally {
    resolved.cleanup?.();
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(`[m2kr] FATAL: ${error instanceof Error ? error.message : String(error)}`);
  await prisma.$disconnect();
  process.exit(1);
});
