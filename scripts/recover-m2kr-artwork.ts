#!/usr/bin/env tsx

/**
 * M2KR release artwork recovery.
 *
 * Reads a release spreadsheet, lists the already-uploaded R2 objects, and
 * builds a deterministic release -> artwork plan using exact filenames.
 *
 * Safety:
 * - Never uploads, renames, or deletes an R2 object.
 * - Defaults to dry-run.
 * - Requires --apply before changing PostgreSQL.
 * - Refuses ambiguous spreadsheet rows, duplicate artwork basenames, or
 *   unresolved releases instead of guessing.
 * - Creates/updates the Attachment record required by EntityArtwork/useAttachment
 *   and points releases.cover_art_url at the existing R2 storage key.
 *
 * Usage:
 *   npx tsx scripts/recover-m2kr-artwork.ts --spreadsheet ./M2KR.xlsx
 *   npx tsx scripts/recover-m2kr-artwork.ts --spreadsheet ./M2KR.xlsx --apply
 *
 * Optional:
 *   --sheet <name>
 *   --release-column <column>
 *   --artwork-column <column>
 *   --prefix <r2-prefix>
 *   --org-id <uuid>
 *   --replace-existing
 */

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { storageClient } from "@/lib/storage";
import { storageConfig } from "@/lib/config/storage";
import * as XLSX from "xlsx";

const DEFAULT_ORG_ID = "6e3b659b-f14e-484e-8ee4-a020cd4c502a";
const prisma = new PrismaClient();

type Row = Record<string, unknown>;
type R2Object = {
  key: string;
  basename: string;
  size: number;
  mimeType: string;
  checksum: string | null;
};
type Release = {
  id: number;
  releaseId: string | null;
  title: string;
  coverArtUrl: string | null;
};
type ExistingAttachment = {
  id: string;
  storageKey: string;
};
type Plan = {
  release: Release;
  artworkName: string;
  object: R2Object;
  existingAttachment: ExistingAttachment | null;
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function has(name: string): boolean {
  return process.argv.includes(name);
}

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function basename(value: string): string {
  const withoutQuery = value.split(/[?#]/, 1)[0].trim();
  return path.posix.basename(withoutQuery.replaceAll("\\", "/"));
}

function normaliseHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], explicit: string | undefined, candidates: string[]): string | null {
  if (explicit) {
    const exact = headers.find((h) => h === explicit);
    if (exact) return exact;
    const normal = normaliseHeader(explicit);
    const match = headers.find((h) => normaliseHeader(h) === normal);
    if (match) return match;
    throw new Error(`Column not found: ${explicit}`);
  }

  const normalHeaders = new Map(headers.map((h) => [normaliseHeader(h), h]));
  for (const candidate of candidates) {
    const exact = normalHeaders.get(normaliseHeader(candidate));
    if (exact) return exact;
  }
  return null;
}

function parseSpreadsheet(filePath: string, sheetName?: string): { rows: Row[]; releaseColumn: string; artworkColumn: string } {
  if (!fs.existsSync(filePath)) throw new Error(`Spreadsheet not found: ${filePath}`);

  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const selectedSheet = sheetName || workbook.SheetNames[0];
  if (!selectedSheet || !workbook.Sheets[selectedSheet]) {
    throw new Error(`Spreadsheet sheet not found: ${selectedSheet || "<none>"}`);
  }

  const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[selectedSheet], { defval: "" });
  if (!rows.length) throw new Error(`Spreadsheet sheet is empty: ${selectedSheet}`);

  const headers = Object.keys(rows[0]);
  const releaseColumn = findColumn(
    headers,
    arg("--release-column"),
    ["Release ID", "Release Name", "Release Title", "Title", "Release", "Name"],
  );
  const artworkColumn = findColumn(
    headers,
    arg("--artwork-column"),
    ["Attachments", "Attachment", "Artwork", "Artwork Filename", "Cover Art", "Cover", "Image", "Filename", "File Name"],
  );

  if (!releaseColumn) throw new Error(`Could not identify the release column. Headers: ${headers.join(", ")}`);
  if (!artworkColumn) throw new Error(`Could not identify the artwork/attachment column. Headers: ${headers.join(", ")}`);

  console.log(`[m2kr-artwork] spreadsheet sheet=${selectedSheet} releaseColumn=${releaseColumn} artworkColumn=${artworkColumn}`);
  return { rows, releaseColumn, artworkColumn };
}

async function listR2Objects(prefix?: string): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await storageClient.send(new ListObjectsV2Command({
      Bucket: storageConfig.bucket,
      Prefix: prefix || undefined,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    }));

    for (const item of response.Contents ?? []) {
      if (!item.Key || item.Key.endsWith("/")) continue;
      const base = basename(item.Key);
      if (!base) continue;

      let mimeType = "application/octet-stream";
      let checksum: string | null = null;
      let size = Number(item.Size ?? 0);

      try {
        const head = await storageClient.send(new HeadObjectCommand({
          Bucket: storageConfig.bucket,
          Key: item.Key,
        }));
        mimeType = head.ContentType || mimeType;
        checksum = head.ChecksumSHA256 || null;
        size = Number(head.ContentLength ?? size);
      } catch (error) {
        console.warn(`[m2kr-artwork] HEAD failed for ${item.Key}: ${error instanceof Error ? error.message : String(error)}`);
      }

      objects.push({ key: item.Key, basename: base, size, mimeType, checksum });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

async function loadM2KRReleases(orgId: string): Promise<Release[]> {
  const rows = await prisma.releases.findMany({
    where: { organization_id: orgId, is_deleted: false },
    select: { id: true, release_id: true, title: true, cover_art_url: true },
    orderBy: { id: "asc" },
  });
  return rows.map((r) => ({ id: r.id, releaseId: r.release_id, title: r.title, coverArtUrl: r.cover_art_url }));
}

function indexUnique<T>(values: T[], key: (value: T) => string): Map<string, T> {
  const counts = new Map<string, number>();
  for (const value of values) {
    const k = key(value);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const result = new Map<string, T>();
  for (const value of values) {
    const k = key(value);
    if (counts.get(k) === 1) result.set(k, value);
  }
  return result;
}

async function buildPlan(orgId: string, spreadsheetPath: string): Promise<{ plans: Plan[]; skipped: string[]; releaseCount: number; artworkCount: number }> {
  const spreadsheet = parseSpreadsheet(spreadsheetPath, arg("--sheet"));
  const releases = await loadM2KRReleases(orgId);
  const objects = await listR2Objects(arg("--prefix"));

  const releaseById = indexUnique(releases.filter((r) => r.releaseId), (r) => clean(r.releaseId));
  const releaseByTitle = indexUnique(releases, (r) => clean(r.title));
  const artworkByBasename = indexUnique(objects, (o) => o.basename);

  const plans: Plan[] = [];
  const skipped: string[] = [];
  const seenReleaseIds = new Set<number>();
  const seenObjectKeys = new Set<string>();

  for (let rowNumber = 0; rowNumber < spreadsheet.rows.length; rowNumber++) {
    const row = spreadsheet.rows[rowNumber];
    const releaseRef = clean(row[spreadsheet.releaseColumn]);
    const artworkName = basename(clean(row[spreadsheet.artworkColumn]));
    const rowLabel = `row ${rowNumber + 2}`;

    if (!releaseRef && !artworkName) continue;
    if (!releaseRef || !artworkName) {
      skipped.push(`${rowLabel}: release/artwork value missing`);
      continue;
    }

    const release = releaseById.get(releaseRef) || releaseByTitle.get(releaseRef);
    if (!release) {
      skipped.push(`${rowLabel}: no exact M2KR release match for "${releaseRef}"`);
      continue;
    }
    if (seenReleaseIds.has(release.id)) {
      skipped.push(`${rowLabel}: release ${release.id} appears more than once in the spreadsheet`);
      continue;
    }

    const object = artworkByBasename.get(artworkName);
    if (!object) {
      skipped.push(`${rowLabel}: no unique R2 object basename match for "${artworkName}"`);
      continue;
    }
    if (seenObjectKeys.has(object.key)) {
      skipped.push(`${rowLabel}: R2 object "${object.key}" is already assigned to another release row`);
      continue;
    }

    const existingAttachment = await prisma.attachment.findFirst({
      where: { organizationId: orgId, entityType: "release", entityId: String(release.id) },
      orderBy: { createdAt: "desc" },
      select: { id: true, storageKey: true },
    });

    const alreadyCorrect = existingAttachment?.storageKey === object.key && release.coverArtUrl === object.key;
    if (existingAttachment && !alreadyCorrect && !has("--replace-existing")) {
      skipped.push(`${rowLabel}: release ${release.id} already has attachment ${existingAttachment.id}; use --replace-existing to update it`);
      continue;
    }

    plans.push({
      release,
      artworkName,
      object,
      existingAttachment: existingAttachment && has("--replace-existing") ? existingAttachment : alreadyCorrect ? existingAttachment : null,
    });
    seenReleaseIds.add(release.id);
    seenObjectKeys.add(object.key);
  }

  return { plans, skipped, releaseCount: releases.length, artworkCount: objects.length };
}

async function applyPlan(orgId: string, plans: Plan[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const plan of plans) {
      const now = new Date();
      const fileName = basename(plan.object.key);
      const category = plan.object.mimeType.startsWith("image/") ? "image" : "other";
      const checksum = plan.object.checksum;

      if (plan.existingAttachment) {
        await tx.attachment.update({
          where: { id: plan.existingAttachment.id },
          data: {
            organizationId: orgId,
            entityType: "release",
            entityId: String(plan.release.id),
            fileName,
            originalName: plan.artworkName,
            mimeType: plan.object.mimeType,
            category,
            fileSize: plan.object.size,
            bucket: storageConfig.bucket,
            storageKey: plan.object.key,
            ...(checksum ? { checksum } : {}),
            updatedAt: now,
          },
        });
      } else {
        await tx.attachment.create({
          data: {
            id: randomUUID(),
            organizationId: orgId,
            entityType: "release",
            entityId: String(plan.release.id),
            fileName,
            originalName: plan.artworkName,
            mimeType: plan.object.mimeType,
            category,
            fileSize: plan.object.size,
            bucket: storageConfig.bucket,
            storageKey: plan.object.key,
            checksum,
            version: 1,
            uploadedBy: "m2kr-artwork-recovery",
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      await tx.releases.update({
        where: { id: plan.release.id },
        data: { cover_art_url: plan.object.key, updated_at: now },
      });
    }
  });
}

async function main(): Promise<void> {
  const spreadsheetPath = arg("--spreadsheet");
  if (!spreadsheetPath) throw new Error("--spreadsheet <path> is required");

  const orgId = arg("--org-id") || DEFAULT_ORG_ID;
  const apply = has("--apply");

  console.log(`[m2kr-artwork] mode=${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`[m2kr-artwork] org=${orgId}`);
  console.log(`[m2kr-artwork] spreadsheet=${path.resolve(spreadsheetPath)}`);
  console.log(`[m2kr-artwork] bucket=${storageConfig.bucket}`);
  console.log(`[m2kr-artwork] prefix=${arg("--prefix") || "<all objects>"}`);

  const { plans, skipped, releaseCount, artworkCount } = await buildPlan(orgId, spreadsheetPath);
  console.log(`[m2kr-artwork] M2KR releases in DB: ${releaseCount}`);
  console.log(`[m2kr-artwork] R2 objects scanned: ${artworkCount}`);
  console.log(`[m2kr-artwork] deterministic matches: ${plans.length}`);
  console.log(`[m2kr-artwork] skipped/unresolved: ${skipped.length}`);

  for (const plan of plans) {
    console.log(`MATCH release=${plan.release.id} ${JSON.stringify(plan.release.title)} <- ${plan.artworkName} <- ${plan.object.key}`);
  }
  for (const item of skipped) console.warn(`SKIP ${item}`);

  if (skipped.length > 0) {
    throw new Error(`Recovery plan is not complete: ${skipped.length} spreadsheet rows could not be resolved safely. No database changes were made.`);
  }

  if (!plans.length) {
    console.log("[m2kr-artwork] Nothing to apply.");
    return;
  }

  if (!apply) {
    console.log("[m2kr-artwork] Dry-run complete. Re-run with --apply to write the validated plan.");
    return;
  }

  await applyPlan(orgId, plans);
  console.log(`[m2kr-artwork] Applied ${plans.length} release artwork links.`);
}

main()
  .catch((error) => {
    console.error(`[m2kr-artwork] FATAL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
