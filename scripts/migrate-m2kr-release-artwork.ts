#!/usr/bin/env tsx

/**
 * M2KR release artwork recovery.
 *
 * Safety model:
 * - dry-run is the default
 * - --execute is required for R2/DB writes
 * - release -> filename mapping comes only from releases.cover_art_url
 * - filenames must exist exactly in the supplied assets directory/archive
 * - storage keys are deterministic
 * - existing release artwork attachments are reused/updated, never blindly duplicated
 * - release metadata is never changed
 *
 * Usage:
 *   npx tsx scripts/migrate-m2kr-release-artwork.ts --assets ./assets
 *   npx tsx scripts/migrate-m2kr-release-artwork.ts --assets ./assets.zip --dry-run
 *   npx tsx scripts/migrate-m2kr-release-artwork.ts --assets ./assets.zip --execute
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
const IMAGE_EXTENSIONS = new Map<string, string>([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"],
  [".webp", "image/webp"], [".gif", "image/gif"], [".avif", "image/avif"],
  [".bmp", "image/bmp"], [".tif", "image/tiff"], [".tiff", "image/tiff"],
]);

type Args = { assetsPath: string; execute: boolean; orgId: string; actorUserId?: number };
type Release = { id: number; title: string | null; cover_art_url: string | null };
type Plan = Release & { filePath: string; fileName: string; mimeType: string; fileSize: number; sha256: string; storageKey: string; existing: Attachment | null };

type Summary = { releases: number; matched: number; missingFiles: number; invalidRefs: number; existingAttachments: number; uploaded: number; attachmentsCreated: number; attachmentsUpdated: number; skippedExistingObjects: number; failures: number };

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let assetsPath = "";
  let execute = false;
  let orgId = process.env.OTTO_M2KR_ORG_ID || DEFAULT_ORG_ID;
  let actorUserId = process.env.OTTO_MIGRATION_ACTOR_USER_ID ? Number(process.env.OTTO_MIGRATION_ACTOR_USER_ID) : undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--assets" && argv[i + 1]) assetsPath = path.resolve(argv[++i]);
    else if (a === "--execute") execute = true;
    else if (a === "--dry-run") execute = false;
    else if (a === "--org-id" && argv[i + 1]) orgId = argv[++i];
    else if (a === "--actor-user-id" && argv[i + 1]) actorUserId = Number(argv[++i]);
    else if (a === "--help" || a === "-h") { printUsage(); process.exit(0); }
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!assetsPath) throw new Error("--assets <directory|zip> is required");
  if (!orgId) throw new Error("M2KR organization id is required");
  if (execute && (!Number.isInteger(actorUserId) || (actorUserId ?? 0) <= 0)) throw new Error("--actor-user-id or OTTO_MIGRATION_ACTOR_USER_ID is required for --execute");
  return { assetsPath, execute, orgId, actorUserId };
}

function printUsage() {
  console.log(`M2KR release artwork recovery\n\nUsage: npx tsx scripts/migrate-m2kr-release-artwork.ts --assets <directory|zip> [--dry-run|--execute] [--org-id <uuid>] [--actor-user-id <id>]`);
}

function resolveAssetsRoot(input: string): { root: string; cleanup?: () => void } {
  const stat = fs.statSync(input);
  if (stat.isDirectory()) return { root: input };
  if (!stat.isFile() || path.extname(input).toLowerCase() !== ".zip") throw new Error("--assets must point to a directory or .zip archive");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "otto-m2kr-assets-"));
  try { execFileSync("unzip", ["-q", input, "-d", temp], { stdio: "inherit" }); }
  catch (e) { fs.rmSync(temp, { recursive: true, force: true }); throw new Error(`Failed to extract archive: ${String(e)}`); }
  return { root: temp, cleanup: () => fs.rmSync(temp, { recursive: true, force: true }) };
}

function collectFiles(root: string): Map<string, string> {
  const result = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "__MACOSX" || entry.name === ".DS_Store") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        if (result.has(entry.name)) throw new Error(`Duplicate canonical artwork filename: ${entry.name}`);
        result.set(entry.name, full);
      }
    }
  };
  walk(root);
  return result;
}

function basenameFromUrl(value: string | null): string | null {
  if (!value) return null;
  const base = path.basename(value.split("?")[0].trim());
  return base && base !== "." && base !== "/" ? base : null;
}

function checksum(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function storageKeyFor(releaseId: number, fileName: string): string {
  return generateStorageKey("releases", String(releaseId), sanitizeFilename(fileName));
}

async function main() {
  const args = parseArgs();
  const assets = resolveAssetsRoot(args.assetsPath);
  try {
    const files = collectFiles(assets.root);
    const releases = await prisma.releases.findMany({ where: { organization_id: args.orgId, cover_art_url: { not: null } }, select: { id: true, title: true, cover_art_url: true }, orderBy: { id: "asc" } });
    const summary: Summary = { releases: releases.length, matched: 0, missingFiles: 0, invalidRefs: 0, existingAttachments: 0, uploaded: 0, attachmentsCreated: 0, attachmentsUpdated: 0, skippedExistingObjects: 0, failures: 0 };
    const plans: Plan[] = [];
    const allAttachments = await prisma.attachment.findMany({ where: { organizationId: args.orgId, entityType: "release" } });
    const byEntity = new Map(allAttachments.map(a => [`${a.entityType}:${a.entityId}`, a]));

    for (const release of releases) {
      const fileName = basenameFromUrl(release.cover_art_url);
      if (!fileName || !/^([0-9a-f]{8}-[0-9a-f-]+)\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/i.test(fileName)) { summary.invalidRefs++; continue; }
      const filePath = files.get(fileName);
      if (!filePath) { summary.missingFiles++; continue; }
      const stat = fs.statSync(filePath);
      const mimeType = IMAGE_EXTENSIONS.get(path.extname(fileName).toLowerCase());
      if (!mimeType) { summary.invalidRefs++; continue; }
      const existing = byEntity.get(`release:${release.id}`) || null;
      if (existing) summary.existingAttachments++;
      plans.push({ ...release, filePath, fileName, mimeType, fileSize: stat.size, sha256: checksum(filePath), storageKey: storageKeyFor(release.id, fileName), existing });
      summary.matched++;
    }

    console.log(JSON.stringify({ mode: args.execute ? "execute" : "dry-run", orgId: args.orgId, archiveFiles: files.size, summary }, null, 2));
    if (!args.execute) return;
    if (summary.missingFiles || summary.invalidRefs || summary.matched !== 81 || releases.length !== 81) throw new Error("Preflight gate failed: expected exactly 81 M2KR releases and 81 valid artwork matches before execute.");

    for (const plan of plans) {
      try {
        let objectExists = false;
        try { await storageClient.send(new HeadObjectCommand({ Bucket: storageConfig.bucketName, Key: plan.storageKey })); objectExists = true; }
        catch { /* object absent */ }
        if (!objectExists) {
          await uploadFile(plan.filePath, { key: plan.storageKey, contentType: plan.mimeType });
          summary.uploaded++;
        } else summary.skippedExistingObjects++;

        const data = { organizationId: args.orgId, entityType: "release", entityId: String(plan.id), fileName: plan.fileName, originalName: plan.fileName, mimeType: plan.mimeType, category: detectMimeCategory(plan.mimeType), fileSize: plan.fileSize, bucket: storageConfig.bucketName, storageKey: plan.storageKey, checksum: plan.sha256, version: 1, uploadedBy: String(args.actorUserId), updatedAt: new Date() };
        if (plan.existing) { await prisma.attachment.update({ where: { id: plan.existing.id }, data }); summary.attachmentsUpdated++; }
        else { await prisma.attachment.create({ data: { id: `${args.orgId}:release:${plan.id}:cover`, createdAt: new Date(), ...data } }); summary.attachmentsCreated++; }
      } catch (error) { summary.failures++; console.error(`[release ${plan.id}] ${String(error)}`); }
    }
    const verify = await prisma.attachment.count({ where: { organizationId: args.orgId, entityType: "release" } });
    console.log(JSON.stringify({ finalSummary: summary, releaseAttachmentCount: verify }, null, 2));
    if (summary.failures || verify < 81) process.exitCode = 1;
  } finally { assets.cleanup?.(); await prisma.$disconnect(); }
}

main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
