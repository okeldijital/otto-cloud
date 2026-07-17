import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

export interface FileInventoryEntry {
  localPath: string;
  relativePath: string;
  size: number;
  mimeType: string;
  checksum: string;
  lastModified: string;
  status: "pending" | "uploaded" | "verified" | "failed";
  error?: string;
  storageKey?: string;
  attachmentId?: string;
  entityType?: string;
  entityId?: string;
  cloudOrgId?: string;
  uploadDurationMs?: number;
  verifiedAt?: string;
}

export interface DbMappingEntry {
  localPath: string;
  table: string;
  column: string;
  recordId: string | number;
  entityType: string;
  entityId: string | number;
  orgId: number;
  originalValue: string;
}

export interface MigrationState {
  inventoryPath: string;
  totalFiles: number;
  pending: string[];
  uploaded: string[];
  verified: string[];
  failed: string[];
  lastUpdated: string;
}

export function computeSHA256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".md": "text/markdown",
    ".json": "application/json",
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
    ".gz": "application/gzip",
    ".7z": "application/x-7z-compressed",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
  };
  return map[ext] ?? "application/octet-stream";
}

export function formatBytes(bytes: number): string {
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

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  delayMs: number,
  label: string,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        await sleep(delayMs * (attempt + 1));
      }
    }
  }
  throw new Error(`${label} failed after ${retries + 1} attempts: ${lastError?.message}`);
}

export function extractFilenameFromPath(filePath: string): string {
  if (!filePath) return "";
  const cleaned = filePath.replace(/\\/g, "/");
  const segments = cleaned.split("/");
  const last = segments[segments.length - 1];
  const queryIndex = last.indexOf("?");
  if (queryIndex >= 0) return last.slice(0, queryIndex);
  return last;
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
