import fs from "fs";
import path from "path";
import { FileInventoryEntry, computeSHA256, detectMimeType, ensureDir, writeJson } from "./utils";
import { getDefaultLocalStorageRoot, getInventoryPath, resolveConfig } from "./config";

export interface DiscoverResult {
  inventoryPath: string;
  totalFiles: number;
  scannedAt: string;
}

export async function discoverFiles(configOverride?: { localStorageRoot?: string }): Promise<DiscoverResult> {
  const config = resolveConfig({ mode: "discover" });
  const storageRoot = configOverride?.localStorageRoot ?? config.localStorageRoot;

  if (!fs.existsSync(storageRoot)) {
    throw new Error(`Local storage root not found: ${storageRoot}`);
  }

  const entries: FileInventoryEntry[] = [];
  const files = scanDirectory(storageRoot);

  console.log(`[discover] Scanning ${storageRoot}...`);
  console.log(`[discover] Found ${files.length} files`);

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const relativePath = path.relative(storageRoot, filePath);
    const stats = fs.statSync(filePath);

    console.log(`[discover] (${i + 1}/${files.length}) ${relativePath} (${formatBytes(stats.size)})`);

    const [checksum, mimeType] = await Promise.all([
      computeSHA256(filePath),
      Promise.resolve(detectMimeType(filePath)),
    ]);

    entries.push({
      localPath: filePath,
      relativePath: relativePath.replace(/\\/g, "/"),
      size: stats.size,
      mimeType,
      checksum,
      lastModified: stats.mtime.toISOString(),
      status: "pending",
    });
  }

  const inventoryPath = getInventoryPath(config);
  ensureDir(path.dirname(inventoryPath));
  writeJson(inventoryPath, entries);

  console.log(`[discover] Wrote inventory: ${inventoryPath}`);
  console.log(`[discover] Total files: ${entries.length}`);

  return {
    inventoryPath,
    totalFiles: entries.length,
    scannedAt: new Date().toISOString(),
  };
}

function scanDirectory(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const rounded = unitIndex === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}
