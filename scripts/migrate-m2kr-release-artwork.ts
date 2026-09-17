#!/usr/bin/env tsx

/**
 * Deterministic M2KR release-artwork attachment reconciliation.
 *
 * The artwork is already present in Cloudflare R2. This utility does not
 * upload, delete, or rename objects. It only verifies the canonical R2
 * objects and creates/updates org-scoped Attachment rows for M2KR releases.
 *
 * Dry-run is the default. --execute is the only database-write gate.
 * Contracts and non-release entities are deliberately out of scope.
 */

import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { PrismaClient, type Attachment } from "@prisma/client";
import path from "node:path";
import {
  detectMimeCategory,
  generateStorageKey,
  sanitizeFilename,
  storageClient,
  storageConfig,
} from "@/lib/storage";

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = "6e3b659b-f14e-484e-8ee4-a020cd4c502a";
const UUID_ARTWORK = /^[0-9a-f]{8}-[0-9a-f-]+\.(jpe?g|png|webp|gif|avif|bmp|tiff?)$/i;
const IMAGE_MIME = new Map<string, string>([
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

type Args = {
  execute: boolean;
  orgId: string;
  actorUserId?: number;
};

type Release = {
  id: number;
  title: string | null;
  cover_art_url: string | null;
};

type Plan = Release & {
  fileName: string;
  mimeType: string;
  storageKey: string;
  existing: Attachment | null;
  objectSize?: number;
  objectContentType?: string;
  objectChecksum?: string;
};

type Summary = {
  releases: number;
  matched: number;
  missingObjects: number;
  invalidRefs: number;
  existingAttachments: number;
  attachmentsToCreate: number;
  attachmentsToUpdate: number;
  failures: number;
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let execute = false;
  let orgId = process.env.OTTO_M2KR_ORG_ID || DEFAULT_ORG_ID;
  let actorUserId = process.env.OTTO_MIGRATION_ACTOR_USER_ID
    ? Number(process.env.OTTO_MIGRATION_ACTOR_USER_ID)
    : undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--execute") execute = true;
    else if (arg === "--dry-run") execute = false;
    else if (arg === "--org-id" && argv[i + 1]) orgId = argv[++i];
    else if (arg === "--actor-user-id" && argv[i + 1]) actorUserId = Number(argv[++i]);
    else if (arg === "--help" || arg === "-h") {
      console.log(
        "npx tsx scripts/migrate-m2kr-release-artwork.ts [--dry-run|--execute] [--org-id <uuid>] [--actor-user-id <id>]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!orgId) throw new Error("M2KR organization id is required");
  if (execute && (!Number.isInteger(actorUserId) || (actorUserId ?? 0) <= 0)) {
    throw new Error("--actor-user-id or OTTO_MIGRATION_ACTOR_USER_ID is required for --execute");
  }

  return { execute, orgId, actorUserId };
}

function basenameFromUrl(value: string | null): string | null {
  if (!value) return null;
  const base = path.basename(value.split("?")[0].trim());
  return base && base !== "." && base !== "/" ? base : null;
}

function canonicalStorageKey(orgId: string, fileName: string): string {
  const safeFileName = sanitizeFilename(fileName);
  const canonicalId = path.basename(safeFileName, path.extname(safeFileName));
  return generateStorageKey({
    organizationId: orgId,
    folder: "releases",
    fileName: safeFileName,
    uuid: canonicalId,
  });
}

function isNotFound(error: unknown): boolean {
  const candidate = error as {
    name?: string;
    Code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate?.name === "NotFound" ||
    candidate?.Code === "NotFound" ||
    candidate?.$metadata?.httpStatusCode === 404
  );
}

async function main() {
  const args = parseArgs();

  try {
    const releases = await prisma.releases.findMany({
      where: {
        organization_id: args.orgId,
        cover_art_url: { not: null },
      },
      select: { id: true, title: true, cover_art_url: true },
      orderBy: { id: "asc" },
    });

    const existingAttachments = await prisma.attachment.findMany({
      where: { organizationId: args.orgId, entityType: "release" },
    });
    const byEntity = new Map(
      existingAttachments.map((attachment) => [
        `${attachment.entityType}:${attachment.entityId}`,
        attachment,
      ])
    );

    const summary: Summary = {
      releases: releases.length,
      matched: 0,
      missingObjects: 0,
      invalidRefs: 0,
      existingAttachments: 0,
      attachmentsToCreate: 0,
      attachmentsToUpdate: 0,
      failures: 0,
    };

    const plans: Plan[] = [];

    for (const release of releases) {
      const fileName = basenameFromUrl(release.cover_art_url);
      if (!fileName || !UUID_ARTWORK.test(fileName)) {
        summary.invalidRefs++;
        continue;
      }

      const mimeType = IMAGE_MIME.get(path.extname(fileName).toLowerCase());
      if (!mimeType) {
        summary.invalidRefs++;
        continue;
      }

      const storageKey = canonicalStorageKey(args.orgId, fileName);
      let head;
      try {
        head = await storageClient.send(
          new HeadObjectCommand({
            Bucket: storageConfig.bucket,
            Key: storageKey,
          })
        );
      } catch (error) {
        if (isNotFound(error)) {
          summary.missingObjects++;
          console.error(`[missing R2 object] release ${release.id}: ${storageKey}`);
          continue;
        }
        throw error;
      }

      const existing = byEntity.get(`release:${release.id}`) || null;
      if (existing) summary.existingAttachments++;
      else summary.attachmentsToCreate++;

      if (existing && existing.storageKey !== storageKey) summary.attachmentsToUpdate++;

      plans.push({
        ...release,
        fileName,
        mimeType,
        storageKey,
        existing,
        objectSize: head.ContentLength,
        objectContentType: head.ContentType,
        objectChecksum: head.Metadata?.checksum,
      });
      summary.matched++;
    }

    console.log(
      JSON.stringify(
        {
          mode: args.execute ? "execute" : "dry-run",
          orgId: args.orgId,
          bucket: storageConfig.bucket,
          summary,
          sample: plans.slice(0, 5).map((plan) => ({
            releaseId: plan.id,
            title: plan.title,
            storageKey: plan.storageKey,
            objectSize: plan.objectSize,
            objectContentType: plan.objectContentType,
            existingAttachmentId: plan.existing?.id ?? null,
          })),
        },
        null,
        2
      )
    );

    if (!args.execute) return;

    if (
      releases.length !== 81 ||
      summary.matched !== 81 ||
      summary.missingObjects !== 0 ||
      summary.invalidRefs !== 0
    ) {
      throw new Error(
        "Preflight gate failed: expected exactly 81 M2KR releases, 81 canonical R2 objects, and zero invalid references."
      );
    }

    for (const plan of plans) {
      try {
        const data = {
          organizationId: args.orgId,
          entityType: "release",
          entityId: String(plan.id),
          fileName: plan.fileName,
          originalName: plan.fileName,
          mimeType: plan.objectContentType || plan.mimeType,
          category: detectMimeCategory(plan.objectContentType || plan.mimeType),
          fileSize: plan.objectSize ?? 0,
          bucket: storageConfig.bucket,
          storageKey: plan.storageKey,
          checksum: plan.objectChecksum ?? null,
          version: 1,
          uploadedBy: String(args.actorUserId),
        };

        if (plan.existing) {
          await prisma.attachment.update({
            where: { id: plan.existing.id },
            data,
          });
        } else {
          await prisma.attachment.create({ data });
        }
      } catch (error) {
        summary.failures++;
        console.error(`[attachment failure] release ${plan.id}: ${String(error)}`);
      }
    }

    const verify = await prisma.attachment.count({
      where: { organizationId: args.orgId, entityType: "release" },
    });

    console.log(
      JSON.stringify(
        { finalSummary: summary, releaseAttachmentCount: verify },
        null,
        2
      )
    );

    if (summary.failures || verify < 81) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
