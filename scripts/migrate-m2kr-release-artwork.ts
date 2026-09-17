#!/usr/bin/env tsx

/**
 * M2KR release-artwork recovery.
 *
 * Controlled migration from the historical artwork archive into the canonical
 * Otto Cloud R2 storage layout, followed by org-scoped Attachment reconciliation.
 *
 * Safety:
 * - dry-run is the default
 * - --execute is the only mutation gate
 * - requires exactly 81 M2KR releases and 81 exact artwork matches
 * - uploads only the matched release artwork; no contracts, works, tracks, or
 *   release metadata are modified
 * - existing R2 objects are verified before reuse
 * - Attachment writes are idempotent per release entity
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient, type Attachment } from "@prisma/client";
import { uploadFile, generateStorageKey, sanitizeFilename, detectMimeCategory, storageClient, storageConfig } from "@/lib/storage";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = "6e3b659b-f14e-484e-8ee4-a020cd4c502a";
const DEFAULT_ACTOR = "migration";
const RELEASE_COUNT = 81;
const UUID_ARTWORK = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/i;
const IMAGE_MIME = new Map<string, string>([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"],
  [".webp", "image/webp"], [".gif", "image/gif"], [".avif", "image/avif"],
  [".bmp", "image/bmp"], [".tif", "image/tiff"], [".tiff", "image/tiff"],
]);

type Args = { execute: boolean; archive: string; orgId: string; actor: string };
type Release = { id: number; title: string | null; cover_art_url: string | null };
type Plan = Release & {
  fileName: string; localPath: string; mimeType: string; storageKey: string;
  checksum: string; fileSize: number; existing: Attachment | null;
  objectExists: boolean; objectSize?: number; objectContentType?: string;
  objectChecksum?: string;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let execute = false;
  let archive = "";
  let orgId = process.env.OTTO_M2KR_ORG_ID || DEFAULT_ORG_ID;
  let actor = process.env.OTTO_MIGRATION_ACTOR || DEFAULT_ACTOR;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--execute") execute = true;
    else if (arg === "--dry-run") execute = false;
    else if (arg === "--assets" && argv[i + 1]) archive = argv[++i];
    else if (arg === "--org-id" && argv[i + 1]) orgId = argv[++i];
    else if (arg === "--actor" && argv[i + 1]) actor = argv[++i];
    else if (arg === "--help" || arg === "-h") {
      console.log("npx tsx scripts/migrate-m2kr-release-artwork.ts --assets <zip|directory> [--dry-run|--execute] [--org-id <uuid>] [--actor <value>]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!archive) throw new Error("--assets <zip|directory> is required");
  if (!orgId) throw new Error("M2KR organization id is required");
  if (!actor) throw new Error("--actor or OTTO_MIGRATION_ACTOR is required");
  return { execute, archive, orgId, actor };
}

function basenameFromUrl(value: string | null): string | null {
  if (!value) return null;
  const base = path.basename(value.split("?")[0].trim());
  return base && base !== "." && base !== "/" ? base : null;
}

function canonicalStorageKey(orgId: string, fileName: string): string {
  const safe = sanitizeFilename(fileName);
  const uuid = path.basename(safe, path.extname(safe));
  return generateStorageKey({ organizationId: orgId, folder: "releases", fileName: safe, uuid });
}

function sha256(filePath: string): string {
  const hash = createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function extractArchive(source: string): { root: string; cleanup: () => void } {
  if (fs.statSync(source).isDirectory()) return { root: source, cleanup: () => {} };

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "otto-m2kr-artwork-"));
  try {
    execFileSync("unzip", ["-q", source, "-d", temp], { stdio: "inherit" });
  } catch (error) {
    fs.rmSync(temp, { recursive: true, force: true });
    throw new Error(`Could not extract archive with unzip: ${String(error)}`);
  }
  return { root: temp, cleanup: () => fs.rmSync(temp, { recursive: true, force: true }) };
}

function collectImages(root: string): Map<string, string> {
  const result = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__MACOSX" || entry.name === ".DS_Store" || entry.name.startsWith("._")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/i.test(entry.name)) {
        const key = entry.name.toLowerCase();
        if (result.has(key)) throw new Error(`Duplicate artwork filename: ${entry.name}`);
        result.set(key, full);
      }
    }
  };
  walk(root);
  return result;
}

function isNotFound(error: unknown): boolean {
  const e = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NotFound" || e?.Code === "NotFound" || e?.$metadata?.httpStatusCode === 404;
}

async function main() {
  const args = parseArgs();
  const { root, cleanup } = extractArchive(args.archive);

  try {
    const files = collectImages(root);
    const releases = await prisma.releases.findMany({
      where: { organization_id: args.orgId, cover_art_url: { not: null } },
      select: { id: true, title: true, cover_art_url: true },
      orderBy: { id: "asc" },
    });

    if (releases.length !== RELEASE_COUNT) {
      throw new Error(`M2KR release count gate failed: expected ${RELEASE_COUNT}, found ${releases.length}`);
    }

    const existingAttachments = await prisma.attachment.findMany({
      where: { organizationId: args.orgId, entityType: "release" },
    });
    const byEntity = new Map(existingAttachments.map(a => [`release:${a.entityId}`, a]));

    const plans: Plan[] = [];
    const invalidRefs: string[] = [];
    const missingFiles: string[] = [];

    for (const release of releases) {
      const fileName = basenameFromUrl(release.cover_art_url);
      if (!fileName || !UUID_ARTWORK.test(fileName)) { invalidRefs.push(`${release.id}:${fileName ?? "null"}`); continue; }

      const localPath = files.get(fileName.toLowerCase());
      if (!localPath) { missingFiles.push(fileName); continue; }

      const mimeType = IMAGE_MIME.get(path.extname(fileName).toLowerCase());
      if (!mimeType) { invalidRefs.push(`${release.id}:${fileName}`); continue; }

      const checksum = sha256(localPath);
      const fileSize = fs.statSync(localPath).size;
      const storageKey = canonicalStorageKey(args.orgId, fileName);
      let objectExists = false;
      let objectSize: number | undefined;
      let objectContentType: string | undefined;
      let objectChecksum: string | undefined;

      try {
        const head = await storageClient.send(new HeadObjectCommand({ Bucket: storageConfig.bucket, Key: storageKey }));
        objectExists = true;
        objectSize = head.ContentLength;
        objectContentType = head.ContentType;
        objectChecksum = head.Metadata?.checksum;
        if (objectSize !== fileSize) {
          throw new Error(`R2 object size mismatch for ${fileName}: archive=${fileSize}, R2=${objectSize}`);
        }
        if (objectChecksum && objectChecksum !== checksum) {
          throw new Error(`R2 checksum mismatch for ${fileName}: archive=${checksum}, R2=${objectChecksum}`);
        }
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }

      plans.push({
        ...release, fileName, localPath, mimeType, storageKey, checksum, fileSize,
        existing: byEntity.get(`release:${release.id}`) ?? null,
        objectExists, objectSize, objectContentType, objectChecksum,
      });
    }

    const matched = plans.length;
    const archiveImageNames = [...files.keys()];
    const extraFiles = archiveImageNames.filter(name => !plans.some(p => p.fileName.toLowerCase() === name));

    console.log(JSON.stringify({
      mode: args.execute ? "execute" : "dry-run",
      orgId: args.orgId,
      bucket: storageConfig.bucket,
      archive: args.archive,
      releaseCount: releases.length,
      archiveImageCount: files.size,
      matched,
      invalidRefs: invalidRefs.length,
      missingFiles: missingFiles.length,
      extraArtworkFiles: extraFiles.length,
      objectsAlreadyPresent: plans.filter(p => p.objectExists).length,
      objectsToUpload: plans.filter(p => !p.objectExists).length,
      attachmentsAlreadyPresent: plans.filter(p => p.existing).length,
      attachmentsToCreate: plans.filter(p => !p.existing).length,
      attachmentsToUpdate: plans.filter(p => p.existing && p.existing!.storageKey !== p.storageKey).length,
      sample: plans.slice(0, 5).map(p => ({ releaseId: p.id, title: p.title, fileName: p.fileName, storageKey: p.storageKey, objectExists: p.objectExists })),
    }, null, 2));

    if (!args.execute) return;

    if (matched !== RELEASE_COUNT || files.size !== RELEASE_COUNT || invalidRefs.length || missingFiles.length || extraFiles.length) {
      throw new Error("Preflight gate failed: archive and M2KR catalogue must reconcile exactly 81↔81 with zero invalid, missing, or extra artwork files.");
    }

    for (const plan of plans) {
      if (!plan.objectExists) {
        const result = await uploadFile({
          body: fs.readFileSync(plan.localPath),
          organizationId: args.orgId,
          folder: "releases",
          fileName: plan.fileName,
          mimeType: plan.mimeType,
          key: plan.storageKey,
          metadata: { checksum: plan.checksum, recoverySource: "M2KR_Catalog_Status_Q1_2026.html" },
        });
        if (result.key !== plan.storageKey) throw new Error(`Unexpected R2 key for ${plan.fileName}`);
      }

      const data = {
        organizationId: args.orgId,
        entityType: "release",
        entityId: String(plan.id),
        fileName: sanitizeFilename(plan.fileName),
        originalName: plan.fileName,
        mimeType: plan.mimeType,
        category: detectMimeCategory(plan.mimeType),
        fileSize: plan.fileSize,
        bucket: storageConfig.bucket,
        storageKey: plan.storageKey,
        checksum: plan.checksum,
        version: 1,
        uploadedBy: args.actor,
      };

      if (plan.existing) await prisma.attachment.update({ where: { id: plan.existing.id }, data });
      else await prisma.attachment.create({ data });
    }

    const finalAttachments = await prisma.attachment.count({
      where: { organizationId: args.orgId, entityType: "release", entityId: { in: plans.map(p => String(p.id)) } },
    });
    if (finalAttachments !== RELEASE_COUNT) throw new Error(`Post-write reconciliation failed: expected 81 release attachments, found ${finalAttachments}`);

    const finalMissing: number[] = [];
    for (const plan of plans) {
      try {
        await storageClient.send(new HeadObjectCommand({ Bucket: storageConfig.bucket, Key: plan.storageKey }));
      } catch {
        finalMissing.push(plan.id);
      }
    }
    if (finalMissing.length) throw new Error(`Post-write R2 reconciliation failed for release IDs: ${finalMissing.join(",")}`);

    console.log(JSON.stringify({
      result: "success",
      releaseAttachments: finalAttachments,
      r2ObjectsVerified: RELEASE_COUNT,
    }, null, 2));
  } finally {
    cleanup();
    await prisma.$disconnect();
  }
}

main().catch(async error => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
