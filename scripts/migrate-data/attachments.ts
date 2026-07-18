/**
 * Phase 6 — link existing Attachment records to migrated entities.
 * NEVER re-uploads files. Reuses storageKey / attachment ids from asset migration.
 */

import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import type { DataMigrateConfig } from "./config";
import { IdMapper } from "./mapping";
import { log, warn, readJson } from "./utils";

/**
 * Best-effort linking:
 * 1. Match contract_documents.file_path / checksum to Attachment.storageKey or originalName
 * 2. Match office_documents, works_admin_documents similarly
 * 3. Heuristic: storageKey path segments (contracts/, artists/, etc.)
 */
export async function linkAttachments(config: DataMigrateConfig): Promise<{
  updated: number;
  skipped: number;
}> {
  const prisma = new PrismaClient();
  const idMapper = new IdMapper(config);
  let updated = 0;
  let skipped = 0;

  log("Phase 6: attachment linking (no re-upload)");

  // Load optional asset inventory for attachmentId ↔ paths
  const inventoryPath = path.join(
    process.cwd(),
    "scripts",
    "migrate-assets",
    "migration-inventory.json",
  );
  type Inv = {
    attachmentId?: string;
    storageKey?: string;
    relativePath?: string;
    entityType?: string;
    entityId?: string;
  };
  let inventory: Inv[] = [];
  if (fs.existsSync(inventoryPath)) {
    const raw = readJson<Record<string, Inv> | Inv[]>(inventoryPath, []);
    inventory = Array.isArray(raw) ? raw : Object.values(raw);
    log(`Loaded ${inventory.length} inventory entries`);
  }

  // Build lookup: basename → possible entity hints from relative paths
  const pathHints = new Map<string, { entityType: string; hint: string }>();
  for (const e of inventory) {
    const rel = e.relativePath ?? "";
    const base = path.basename(rel);
    if (rel.includes("contracts/")) {
      pathHints.set(base, { entityType: "contract", hint: rel });
    } else if (rel.includes("office_documents/")) {
      pathHints.set(base, { entityType: "office_document", hint: rel });
    } else if (rel.includes("works_admin/")) {
      pathHints.set(base, { entityType: "works_admin", hint: rel });
    }
  }

  // Link from contract_documents file_path → contracts
  try {
    const docs = await prisma.contract_documents.findMany({
      select: {
        id: true,
        contract_id: true,
        file_path: true,
        file_name: true,
        checksum: true,
      },
    });
    for (const doc of docs) {
      if (!doc.file_path && !doc.file_name) continue;
      const candidates = await prisma.attachment.findMany({
        where: {
          OR: [
            doc.file_name
              ? { originalName: { contains: doc.file_name } }
              : undefined,
            doc.file_path
              ? { storageKey: { contains: path.basename(doc.file_path) } }
              : undefined,
            doc.checksum ? { checksum: doc.checksum } : undefined,
          ].filter(Boolean) as any[],
        },
        take: 5,
      });
      for (const att of candidates) {
        if (att.entityType === "contract" && att.entityId === String(doc.contract_id)) {
          skipped += 1;
          continue;
        }
        if (config.dryRun) {
          log(
            `dry-run link attachment ${att.id} → contract ${doc.contract_id}`,
          );
          updated += 1;
          continue;
        }
        await prisma.attachment.update({
          where: { id: att.id },
          data: {
            entityType: "contract",
            entityId: String(doc.contract_id),
          },
        });
        updated += 1;
      }
    }
  } catch (e: any) {
    warn(`contract_documents linking: ${e.message}`);
  }

  // Heuristic: update orphan misc attachments with path-based types (no entity id if unknown)
  try {
    const orphans = await prisma.attachment.findMany({
      where: {
        OR: [{ entityId: "orphan" }, { entityType: "misc" }],
      },
      take: 2000,
    });
    for (const att of orphans) {
      const base = path.basename(att.storageKey);
      const hint = pathHints.get(base) ?? pathHints.get(att.originalName);
      if (!hint) {
        skipped += 1;
        continue;
      }
      // Without a concrete entity id we only refine entityType if still misc
      if (att.entityType !== "misc" && att.entityId !== "orphan") {
        skipped += 1;
        continue;
      }
      // Keep entityId as-is unless id-map has a single-org default — skip id assignment
      if (config.dryRun) {
        log(`dry-run classify ${att.id} as ${hint.entityType}`);
        updated += 1;
        continue;
      }
      // Classification only when we still lack a real id
      await prisma.attachment.update({
        where: { id: att.id },
        data: {
          entityType: hint.entityType,
        },
      });
      updated += 1;
    }
  } catch (e: any) {
    warn(`orphan classification: ${e.message}`);
  }

  // If artists were migrated and profile_image_url contains storage keys, link
  try {
    const artists = await prisma.artists.findMany({
      where: { profile_image_url: { not: null } },
      select: { id: true, profile_image_url: true },
    });
    for (const a of artists) {
      const url = a.profile_image_url ?? "";
      if (!url) continue;
      const base = path.basename(url.split("?")[0] ?? url);
      const att = await prisma.attachment.findFirst({
        where: {
          OR: [
            { storageKey: { contains: base } },
            { originalName: { contains: base } },
            { fileName: { contains: base } },
          ],
        },
      });
      if (!att) {
        skipped += 1;
        continue;
      }
      if (config.dryRun) {
        updated += 1;
        continue;
      }
      await prisma.attachment.update({
        where: { id: att.id },
        data: { entityType: "artist", entityId: String(a.id) },
      });
      updated += 1;
    }
  } catch (e: any) {
    warn(`artist image linking: ${e.message}`);
  }

  void idMapper; // reserved for future path-id decoding
  await prisma.$disconnect();
  log(`Attachment linking: updated=${updated} skipped=${skipped}`);
  return { updated, skipped };
}
