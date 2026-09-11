#!/usr/bin/env tsx

/**
 * M2KR release artwork recovery.
 *
 * Purpose:
 *   Restore the canonical artwork referenced by releases.cover_art_url into
 *   Otto Cloud R2 and create the corresponding release Attachment records.
 *
 * Safety model:
 *   - dry-run is the default
 *   - --execute is required for R2/DB writes
 *   - release -> filename mapping comes only from releases.cover_art_url
 *   - filenames must exist exactly in the supplied assets directory/archive
 *   - storage keys are deterministic, so reruns do not create new objects
 *   - existing release artwork attachments are reused/updated, never blindly duplicated
 *   - no release metadata is changed
 *
 * Usage:
 *   npx tsx scripts/migrate-m2kr-release-artwork.ts --assets ./assets
 *   npx tsx scripts/migrate-m2kr-release-artwork.ts --assets ./assets.zip --dry-run
 *   npx tsx scripts/migrate-m2kr-release-artwork.ts --assets ./assets.zip --execute
 *
 * Required for --execute:
 *   DATABASE_URL (and DIRECT_URL where required by the project)
 *   R2_BUCKET_NAME
 *   R2_ENDPOINT
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   OTTO_M2KR_ORG_ID
 *   OTTO_MIGRATION_ACTOR_USER_ID
 *
 * The archive form uses the system `unzip` command. This is intentional for
 * the current Mac-first migration workflow; the archive is never committed
 * to the repository or sent through Vercel.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient, type Attachment } from "@prisma/client";

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
const ASSET_PREFIX = "assets/";
const STORAGE_FOLDER = "releases";
const IMAGE_EXTENSIONS = new Map<string, string>([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
]);

interface ReleaseRow {
  id: number;
  title: string | null;
  cover_art_url: string | null;
}

interface PlannedRelease {
  release: ReleaseRow;
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  storageKey: string;
  existingAttachment: Attachment | null;
}

interface Summary {
  releases: number;
  matched: number;
  missingFiles: number;
  invalidRefs: number;
  existingAttachments: number;
  uploaded: number;
  attachmentsCreated: number;
  attachmentsUpdated: number;
  skippedExistingObjects: number;
  failures: number;
}

function parseArgs(): { assetsPath: string; execute: boolean; orgId: string; actorUserId?: number } {
  const args = process.argv.slice(2);
  let assetsPath = "";
  let execute = false;
  let orgId = process.env.OTTO_M2KR_ORG_ID || DEFAULT_ORG_ID;
  let actorUserId = process.env.OTTO_MIGRATION_ACTOR_USER_ID
    ? Number(process.env.OTTO_MIGRATION_ACTOR_USER_ID)
    : undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--assets" && args[i + 1]) {
      assetsPath = path.resolve(args[++i]);
    } else if (arg === "--execute") {
      execute = true;
    } else if (arg === "--dry-run") {
      execute = false;
    } else if (arg === "--org-id" && args[i + 1]) {
      orgId = args[++i];
    } else if (arg === "--actor-user-id" && args[i + 1]) {
      actorUserId = Number(args[++i]);
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!assetsPath) {
    throw new Error("--assets <directory|zip> is required");
  }
  if (!orgId) {
    throw new Error("M2KR organization id is required");
  }
  if (execute && (!Number.isInteger(actorUserId) || (actorUserId ?? 0) <= 0)) {
    throw new Error("--actor-user-id or OTTO_MIGRATION_ACTOR_USER_ID is required for --execute");
  }

  return { assetsPath, execute, orgId, actorUserId };
}

function printUsage(): void {
  console.log(`
Otto Cloud — M2KR Release Artwork Recovery

Usage:
  npx tsx scripts/migrate-m2kr-release-artwork.ts --assets <directory|zip> [options]

Options:
  --assets <path>          Assets directory or assets.zip (required)
  --dry-run                Validate mapping only; no R2/DB writes (default)
  --execute                Upload to R2 and create/update release attachments
  --org-id <uuid>          M2KR organization UUID
  --actor-user-id <id>     Existing Otto user id used for attachment audit
  --help                   Show this help

Environment for --execute:
  DATABASE_URL
  R2_BUCKET_NAME
  R2_ENDPOINT
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  OTTO_M2KR_ORG_ID
  OTTO_MIGRATION_ACTOR_USER_ID

The migration is intentionally deterministic and idempotent. It uses each
release's historical cover_art_url as the only release-to-file mapping source.
`);
}

function ensureFileExists(filePath: string): void {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Assets path does not exist or is not a file: ${filePath}`);
  }
}

function resolveAssetsRoot(inputPath: string): { root: string; cleanup?: () => void } {
  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) {
    return { root: inputPath };
  }

  if (!stat.isFile() || path.extname(inputPath).toLowerCase() !== ".zip") {
    throw new Error("--assets must point to a directory or .zip archive");
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "otto-m2kr-assets-"));
  try {
    execFileSync("unzip", ["-q", inputPath, "-d", tempRoot], { stdio: "inherit" });
  } catch (error) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    throw new Error(`Failed to extract archive with unzip: ${String(error)}`);
  }

  return {
    root: tempRoot,
    cleanup: () => fs.rmSync(tempRoot, { recursive: true, force: true }),
  };
}

function collectFiles(root: string): Map<string, string> {
  const result = new Map<string, string>();

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__MACOSX" || entry.name === ".DS_Store") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTENSIONS.has(ext)) continue;
      if (result.has(entry.name)) {
        throw new Error(`Duplicate canonical artwork filename found: ${entry.name}`);
      }
      result.set(entry.name, fullPath);
    }
  }

  walk(root);
  return result;
}

function filenameFromCoverRef(value: string | null): string | null {
  if (!value) return null;
  const clean = value.split("?")[0].trim();
  if (!clean.startsWith(ASSET_PREFIX)) return null;
  const filename = path.basename(clean);
  if (!filename || filename === "." || filename === "/") return null;
  return filename;
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function stableStorageUuid(releaseId: number): string {
  const hex = createHash("sha256")
    .update(`otto-m2kr-release-artwork:${releaseId}`)
    .digest("hex")
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function buildStorageKey(orgId: string, releaseId: number, fileName: string): string {
  return generateStorageKey({
    organizationId: orgId,
    folder: STORAGE_FOLDER,
    fileName: sanitizeFilename(fileName),
    uuid: stableStorageUuid(releaseId),
  });
}

async function loadReleases(orgId: string): Promise<ReleaseRow[]> {
  return prisma.$queryRaw<ReleaseRow[]>`
    SELECT id, title, cover_art_url
    FROM releases
    WHERE organization_id = ${orgId}::uuid
      AND cover_art_url IS NOT NULL
    ORDER BY id
  `;
}

async function validateActor(orgId: string, actorUserId: number): Promise<void> {
  const actor = await prisma.user.findFirst({
    where: { id: actorUserId, organization_id: orgId },
    select: { id: true, email: true },
  });
  if (!actor) {
    throw new Error(`Actor user ${actorUserId} is not an active user in organization ${orgId}`);
  }
  console.log(`[preflight] actor=${actor.id} (${actor.email})`);
}

async function plan(
  orgId: string,
  assets: Map<string, string>,
): Promise<{ planned: PlannedRelease[]; summary: Summary }> {
  const releases = await loadReleases(orgId);
  const summary: Summary = {
    releases: releases.length,
    matched: 0,
    missingFiles: 0,
    invalidRefs: 0,
    existingAttachments: 0,
    uploaded: 0,
    attachmentsCreated: 0,
    attachmentsUpdated: 0,
    skippedExistingObjects: 0,
    failures: 0,
  };

  const planned: PlannedRelease[] = [];

  for (const release of releases) {
    const fileName = filenameFromCoverRef(release.cover_art_url);
    if (!fileName) {
      summary.invalidRefs += 1;
      console.error(`[plan] Invalid cover_art_url for release ${release.id}: ${release.cover_art_url}`);
      continue;
    }

    const filePath = assets.get(fileName);
    if (!filePath) {
      summary.missingFiles += 1;
      console.error(`[plan] Missing artwork for release ${release.id}: ${fileName}`);
      continue;
    }

    const mimeType = IMAGE_EXTENSIONS.get(path.extname(fileName).toLowerCase());
    if (!mimeType) {
      summary.invalidRefs += 1;
      console.error(`[plan] Unsupported artwork type for release ${release.id}: ${fileName}`);
      continue;
    }

    const existingAttachment = await prisma.attachment.findFirst({
      where: {
        organizationId: orgId,
        entityType: "release",
        entityId: String(release.id),
        category: "image",
      },
      orderBy: { version: "desc" },
    });

    if (existingAttachment) summary.existingAttachments += 1;
    summary.matched += 1;

    planned.push({
      release,
      filePath,
      fileName,
      mimeType,
      fileSize: fs.statSync(filePath).size,
      sha256: sha256File(filePath),
      storageKey: buildStorageKey(orgId, release.id, fileName),
      existingAttachment,
    });
  }

  return { planned, summary };
}

async function objectExists(key: string): Promise<{ exists: boolean; size?: number; etag?: string }> {
  try {
    const head = await storageClient.send(
      new HeadObjectCommand({ Bucket: storageConfig.bucket, Key: key }),
    );
    return {
      exists: true,
      size: Number(head.ContentLength ?? 0),
      etag: head.ETag ?? undefined,
    };
  } catch (error: any) {
    const status = error?.$metadata?.httpStatusCode;
    if (status === 404 || error?.name === "NotFound" || error?.name === "NoSuchKey") {
      return { exists: false };
    }
    throw error;
  }
}

async function executePlan(
  orgId: string,
  actorUserId: number,
  planned: PlannedRelease[],
  summary: Summary,
): Promise<void> {
  for (const item of planned) {
    const { release, filePath, fileName, mimeType, fileSize, sha256, storageKey } = item;
    try {
      if (fileSize > storageConfig.maxUploadSize) {
        throw new Error(`Artwork exceeds storage max size: ${fileSize} bytes`);
      }

      const existingObject = await objectExists(storageKey);
      let etag = existingObject.etag;

      if (existingObject.exists) {
        if (existingObject.size !== fileSize) {
          throw new Error(
            `Existing R2 object size mismatch for ${storageKey}: R2=${existingObject.size}, local=${fileSize}`,
          );
        }
        summary.skippedExistingObjects += 1;
      } else {
        const buffer = fs.readFileSync(filePath);
        const uploaded = await uploadFile({
          body: buffer,
          organizationId: orgId,
          folder: STORAGE_FOLDER,
          fileName,
          mimeType,
          key: storageKey,
          metadata: {
            releaseId: String(release.id),
            source: "m2kr-artwork-recovery",
            sha256,
          },
        });
        etag = uploaded.etag;
        summary.uploaded += 1;
      }

      const existing = await prisma.attachment.findFirst({
        where: {
          organizationId: orgId,
          entityType: "release",
          entityId: String(release.id),
          category: "image",
        },
        orderBy: { version: "desc" },
      });

      const data = {
        organizationId: orgId,
        entityType: "release",
        entityId: String(release.id),
        fileName: sanitizeFilename(fileName),
        originalName: fileName,
        mimeType,
        category: detectMimeCategory(mimeType),
        fileSize,
        bucket: storageConfig.bucket,
        storageKey,
        checksum: etag ?? null,
        version: existing ? existing.version + 1 : 1,
        uploadedBy: String(actorUserId),
      };

      if (existing) {
        if (existing.storageKey === storageKey && existing.fileSize === fileSize) {
          // The canonical row already represents this migration target.
          console.log(`[execute] release ${release.id}: attachment already current`);
          continue;
        }
        await prisma.attachment.update({ where: { id: existing.id }, data });
        summary.attachmentsUpdated += 1;
        console.log(`[execute] release ${release.id}: attachment updated`);
      } else {
        await prisma.attachment.create({ data });
        summary.attachmentsCreated += 1;
        console.log(`[execute] release ${release.id}: attachment created`);
      }
    } catch (error) {
      summary.failures += 1;
      console.error(
        `[execute] release ${release.id} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

async function verify(orgId: string, planned: PlannedRelease[]): Promise<void> {
  let failures = 0;
  for (const item of planned) {
    const attachment = await prisma.attachment.findFirst({
      where: {
        organizationId: orgId,
        entityType: "release",
        entityId: String(item.release.id),
        category: "image",
      },
      orderBy: { version: "desc" },
    });

    if (!attachment) {
      failures += 1;
      console.error(`[verify] release ${item.release.id}: attachment missing`);
      continue;
    }

    if (attachment.storageKey !== item.storageKey) {
      failures += 1;
      console.error(
        `[verify] release ${item.release.id}: storage key mismatch (${attachment.storageKey})`,
      );
      continue;
    }

    const object = await objectExists(item.storageKey);
    if (!object.exists || object.size !== item.fileSize) {
      failures += 1;
      console.error(`[verify] release ${item.release.id}: R2 object missing or size mismatch`);
      continue;
    }

    console.log(`[verify] release ${item.release.id}: OK`);
  }

  if (failures > 0) {
    throw new Error(`Verification failed for ${failures} release(s)`);
  }
}

async function main(): Promise<void> {
  const { assetsPath, execute, orgId, actorUserId } = parseArgs();
  ensureFileExists(assetsPath);

  console.log(`[m2kr] mode=${execute ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`[m2kr] org=${orgId}`);
  console.log(`[m2kr] assets=${assetsPath}`);

  if (execute) {
    await validateActor(orgId, actorUserId!);
    console.log("[m2kr] WARNING: this run will write to R2 and the production database.");
  }

  const resolved = resolveAssetsRoot(assetsPath);
  try {
    const assets = collectFiles(resolved.root);
    console.log(`[preflight] canonical image files=${assets.size}`);

    const { planned, summary } = await plan(orgId, assets);
    console.log(`[preflight] releases=${summary.releases}`);
    console.log(`[preflight] mapped=${summary.matched}`);
    console.log(`[preflight] missingFiles=${summary.missingFiles}`);
    console.log(`[preflight] invalidRefs=${summary.invalidRefs}`);
    console.log(`[preflight] existingAttachments=${summary.existingAttachments}`);

    if (assets.size !== summary.releases || summary.matched !== summary.releases) {
      throw new Error(
        `Preflight did not produce a complete one-to-one release artwork set: assets=${assets.size}, releases=${summary.releases}, matched=${summary.matched}`,
      );
    }

    if (!execute) {
      console.log("[m2kr] Dry-run passed. No R2 or database writes were performed.");
      return;
    }

    await executePlan(orgId, actorUserId!, planned, summary);
    if (summary.failures > 0) {
      throw new Error(`Execution completed with ${summary.failures} failure(s); refusing to call migration verified.`);
    }

    await verify(orgId, planned);
    console.log("[m2kr] Migration and verification completed successfully.");
    console.log(JSON.stringify(summary, null, 2));
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
