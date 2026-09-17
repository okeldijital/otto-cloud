#!/usr/bin/env tsx

/**
 * Deterministic M2KR release-artwork recovery.
 *
 * Dry-run is the default. --execute is the only write gate.
 * Only release cover_art_url references are used; contracts and other entities
 * are deliberately out of scope.
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
const UUID_ARTWORK = /^[0-9a-f]{8}-[0-9a-f-]+\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/i;
const IMAGE_MIME = new Map([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"],
  [".webp", "image/webp"], [".gif", "image/gif"], [".avif", "image/avif"],
  [".bmp", "image/bmp"], [".tif", "image/tiff"], [".tiff", "image/tiff"],
]);

type Args = { assets: string; execute: boolean; orgId: string; actorUserId?: number };
type Release = { id: number; title: string | null; cover_art_url: string | null };
type Plan = Release & { filePath: string; fileName: string; mimeType: string; fileSize: number; sha256: string; storageKey: string; existing: Attachment | null };

type Summary = {
  releases: number; canonicalFiles: number; matched: number; missingFiles: number;
  invalidRefs: number; existingAttachments: number; uploaded: number;
  attachmentsCreated: number; attachmentsUpdated: number; skippedExistingObjects: number;
  failures: number;
};

function args(): Args {
  const argv = process.argv.slice(2);
  let assets = "";
  let execute = false;
  let orgId = process.env.OTTO_M2KR_ORG_ID || DEFAULT_ORG_ID;
  let actorUserId = process.env.OTTO_MIGRATION_ACTOR_USER_ID
    ? Number(process.env.OTTO_MIGRATION_ACTOR_USER_ID) : undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--assets" && argv[i + 1]) assets = path.resolve(argv[++i]);
    else if (arg === "--execute") execute = true;
    else if (arg === "--dry-run") execute = false;
    else if (arg === "--org-id" && argv[i + 1]) orgId = argv[++i];
    else if (arg === "--actor-user-id" && argv[i + 1]) actorUserId = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") {
      console.log("npx tsx scripts/migrate-m2kr-release-artwork.ts --assets <directory|zip> [--dry-run|--execute] [--org-id <uuid>] [--actor-user-id <id>]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!assets) throw new Error("--assets <directory|zip> is required");
  if (execute && (!Number.isInteger(actorUserId) || (actorUserId ?? 0) <= 0)) {
    throw new Error("--actor-user-id or OTTO_MIGRATION_ACTOR_USER_ID is required for --execute");
  }
  return { assets, execute, orgId, actorUserId };
}

function assetRoot(input: string): { root: string; cleanup?: () => void } {
  const stat = fs.statSync(input);
  if (stat.isDirectory()) return { root: input };
  if (!stat.isFile() || path.extname(input).toLowerCase() !== ".zip") {
    throw new Error("--assets must point to a directory or .zip archive");
  }
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "otto-m2kr-assets-"));
  try {
    execFileSync("unzip", ["-q", input, "-d", temp], { stdio: "inherit" });
  } catch (error) {
    fs.rmSync(temp, { recursive: true, force: true });
    throw new Error(`Failed to extract archive: ${String(error)}`);
  }
  return { root: temp, cleanup: () => fs.rmSync(temp, { recursive: true, force: true }) };
}

function collectCanonicalFiles(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__MACOSX" || entry.name === ".DS_Store") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && UUID_ARTWORK.test(entry.name)) {
        if (files.has(entry.name)) throw new Error(`Duplicate canonical artwork filename: ${entry.name}`);
        files.set(entry.name, full);
      }
    }
  };
  walk(root);
  return files;
}

function basenameFromUrl(value: string | null): string | null {
  if (!value) return null;
  const base = path.basename(value.split("?")[0].trim());
  return base && base !== "." && base !== "/" ? base : null;
}

function sha256(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function storageKeyFor(orgId: string, fileName: string): string {
  const safe = sanitizeFilename(fileName);
  const uuid = path.basename(safe, path.extname(safe));
  return generateStorageKey({ organizationId: orgId, folder: "releases", fileName: safe, uuid });
}

function isNotFound(error: unknown): boolean {
  const e = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === "NotFound" || e?.Code === "NotFound" || e?.$metadata?.httpStatusCode === 404;
}

async function main() {
  const options = args();
  const assets = assetRoot(options.assets);

  try {
    const files = collectCanonicalFiles(assets.root);
    const releases = await prisma.releases.findMany({
      where: { organization_id: options.orgId, cover_art_url: { not: null } },
      select: { id: true, title: true, cover_art_url: true },
      orderBy: { id: "asc" },
    });

    const summary: Summary = {
      releases: releases.length, canonicalFiles: files.size, matched: 0,
      missingFiles: 0, invalidRefs: 0, existingAttachments: 0, uploaded: 0,
      attachmentsCreated: 0, attachmentsUpdated: 0, skippedExistingObjects: 0, failures: 0,
    };

    const existing = await prisma.attachment.findMany({
      where: { organizationId: options.orgId, entityType: "release" },
    });
    const byEntity = new Map(existing.map((a) => [`${a.entityType}:${a.entityId}`, a]));
    const plans: Plan[] = [];

    for (const release of releases) {
      const fileName = basenameFromUrl(release.cover_art_url);
      if (!fileName || !UUID_ARTWORK.test(fileName)) {
        summary.invalidRefs++;
        continue;
      }
      const filePath = files.get(fileName);
      if (!filePath) {
        summary.missingFiles++;
        continue;
      }
      const mimeType = IMAGE_MIME.get(path.extname(fileName).toLowerCase());
      if (!mimeType) {
        summary.invalidRefs++;
        continue;
      }
      const attachment = byEntity.get(`release:${release.id}`) || null;
      if (attachment) summary.existingAttachments++;
      const stat = fs.statSync(filePath);
      plans.push({
        ...release,
        filePath,
        fileName,
        mimeType,
        fileSize: stat.size,
        sha256: sha256(filePath),
        storageKey: storageKeyFor(options.orgId, fileName),
        existing: attachment,
      });
      summary.matched++;
    }

    console.log(JSON.stringify({ mode: options.execute ? "execute" : "dry-run", orgId: options.orgId, summary }, null, 2));
    if (!options.execute) return;

    if (files.size !== 81 || releases.length !== 81 || summary.matched !== 81 || summary.missingFiles || summary.invalidRefs) {
      throw new Error("Preflight gate failed: expected exactly 81 canonical M2KR artwork files, 81 releases, and 81 valid matches.");
    }

    for (const plan of plans) {
      try {
        let objectExists = false;
        try {
          await storageClient.send(new HeadObjectCommand({ Bucket: storageConfig.bucket, Key: plan.storageKey }));
          objectExists = true;
        } catch (error) {
          if (!isNotFound(error)) throw error;
        }

        if (!objectExists) {
          await uploadFile({
            body: fs.readFileSync(plan.filePath),
            organizationId: options.orgId,
            folder: "releases",
            fileName: plan.fileName,
            mimeType: plan.mimeType,
            key: plan.storageKey,
            contentDisposition: "inline",
            metadata: { entityType: "release", entityId: String(plan.id), checksum: plan.sha256 },
          });
          summary.uploaded++;
        } else {
          summary.skippedExistingObjects++;
        }

        const data = {
          organizationId: options.orgId,
          entityType: "release",
          entityId: String(plan.id),
          fileName: plan.fileName,
          originalName: plan.fileName,
          mimeType: plan.mimeType,
          category: detectMimeCategory(plan.mimeType),
          fileSize: plan.fileSize,
          bucket: storageConfig.bucket,
          storageKey: plan.storageKey,
          checksum: plan.sha256,
          version: 1,
          uploadedBy: String(options.actorUserId),
        };

        if (plan.existing) {
          await prisma.attachment.update({ where: { id: plan.existing.id }, data });
          summary.attachmentsUpdated++;
        } else {
          await prisma.attachment.create({ data });
          summary.attachmentsCreated++;
        }
      } catch (error) {
        summary.failures++;
        console.error(`[release ${plan.id}] ${String(error)}`);
      }
    }

    const releaseAttachmentCount = await prisma.attachment.count({
      where: { organizationId: options.orgId, entityType: "release" },
    });
    console.log(JSON.stringify({ finalSummary: summary, releaseAttachmentCount }, null, 2));
    if (summary.failures || releaseAttachmentCount !== 81) process.exitCode = 1;
  } finally {
    assets.cleanup?.();
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
