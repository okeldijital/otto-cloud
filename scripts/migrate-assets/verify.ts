import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { storageClient, storageConfig } from "@/lib/storage";
import { computeSHA256, formatBytes, writeJson, readJson, sleep } from "./utils";
import { resolveConfig, getStatePath, MigrateConfig } from "./config";
import { FileInventoryEntry, MigrationState } from "./utils";

const prisma = new PrismaClient();

export async function verifyAssets(configOverride?: Partial<MigrateConfig>): Promise<void> {
  const config = resolveConfig({ ...configOverride, mode: "verify" });
  const statePath = getStatePath(config);

  if (!fs.existsSync(statePath)) {
    console.error("[verify] No migration state found. Run migrate first.");
    process.exit(1);
  }

  const state = readJson<MigrationState>(statePath, {
    inventoryPath: "",
    totalFiles: 0,
    pending: [],
    uploaded: [],
    verified: [],
    failed: [],
    lastUpdated: "",
  });

  const inventoryPath = state.inventoryPath;
  if (!fs.existsSync(inventoryPath)) {
    console.error("[verify] Inventory file not found.");
    process.exit(1);
  }

  const inventory: FileInventoryEntry[] = readJson<FileInventoryEntry[]>(inventoryPath, []);
  const inventoryMap = new Map(inventory.map((e) => [e.localPath, e]));

  console.log(`[verify] Total files: ${state.totalFiles}`);
  console.log(`[verify] Uploaded: ${state.uploaded.length}, Verified: ${state.verified.length}, Failed: ${state.failed.length}`);

  const toVerify = state.uploaded.filter((p) => !state.verified.includes(p));
  console.log(`[verify] Remaining to verify: ${toVerify.length}`);

  let verifiedCount = 0;
  let failedCount = 0;

  for (const localPath of toVerify) {
    const entry = inventoryMap.get(localPath);
    if (!entry) {
      console.warn(`[verify] Entry not found in inventory: ${localPath}`);
      continue;
    }

    if (!entry.storageKey) {
      console.warn(`[verify] No storage key for ${localPath}`);
      entry.status = "failed";
      entry.error = "Missing storage key";
      state.failed.push(localPath);
      state.uploaded = state.uploaded.filter((p) => p !== localPath);
      failedCount++;
      continue;
    }

    let fileOk = false;
    let attachmentOk = false;
    let errors: string[] = [];

    try {
      const headCmd = new HeadObjectCommand({
        Bucket: storageConfig.bucket,
        Key: entry.storageKey,
      });

      const headResponse = await storageClient.send(headCmd);
      const cloudSize = headResponse.ContentLength ?? 0;
      if (cloudSize !== entry.size) {
        errors.push(`Size mismatch: local=${entry.size}, cloud=${cloudSize}`);
      } else {
        fileOk = true;
      }
    } catch (err) {
      errors.push(`Storage check failed: ${(err as Error).message}`);
    }

    try {
      const attachment = await prisma.attachment.findFirst({
        where: { storageKey: entry.storageKey, organizationId: `${entry.cloudOrgId ?? ""}` },
      });
      if (!attachment) {
        errors.push("Attachment record not found");
      } else if (attachment.entityId !== entry.entityId || attachment.entityType !== entry.entityType) {
        errors.push(`Attachment entity mismatch: expected ${entry.entityType}/${entry.entityId}, got ${attachment.entityType}/${attachment.entityId}`);
      } else {
        attachmentOk = true;
      }
    } catch (err) {
      errors.push(`Database check failed: ${(err as Error).message}`);
    }

    if (fileOk && attachmentOk) {
      entry.status = "verified";
      entry.verifiedAt = new Date().toISOString();
      state.verified.push(localPath);
      state.uploaded = state.uploaded.filter((p) => p !== localPath);
      verifiedCount++;
      console.log(`[verify] ✓ ${entry.relativePath}`);
    } else {
      entry.status = "failed";
      entry.error = errors.join("; ");
      state.failed.push(localPath);
      state.uploaded = state.uploaded.filter((p) => p !== localPath);
      failedCount++;
      console.error(`[verify] ✗ ${entry.relativePath}: ${entry.error}`);
    }
  }

  console.log(`[verify] Verified: ${verifiedCount}, Failed: ${failedCount}`);

  const remaining = state.uploaded.filter((p) => !state.verified.includes(p));
  if (remaining.length > 0) {
    console.log(`[verify] Still pending verification: ${remaining.length}`);
  }

  writeJson(getStatePath(config), state);
  console.log("[verify] Verification complete.");
}
