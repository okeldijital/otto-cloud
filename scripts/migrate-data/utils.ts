/**
 * Shared utilities for the data migration framework.
 */

import fs from "fs";
import path from "path";

export type Json =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null;

export function log(...args: unknown[]): void {
  console.log(`[migrate:data]`, ...args);
}

export function warn(...args: unknown[]): void {
  console.warn(`[migrate:data:WARN]`, ...args);
}

export function error(...args: unknown[]): void {
  console.error(`[migrate:data:ERROR]`, ...args);
}

export function writeJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export function readJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeText(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

export function parseJson(value: unknown): Json | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value as Json;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "null") return null;
  try {
    return JSON.parse(trimmed) as Json;
  } catch {
    return value as Json;
  }
}

export function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (s === "") return null;
  const timeOnly = /^(\d{1,2}):(\d{2})(:(\d{2}))?$/.test(s);
  const d = timeOnly ? new Date(`1970-01-01T${s}Z`) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function toBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const s = String(value).trim().toLowerCase();
  if (["1", "true", "t", "yes", "y"].includes(s)) return true;
  if (["0", "false", "f", "no", "n"].includes(s)) return false;
  return null;
}

export function looksLikeDateColumn(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.endsWith("_at")) return true;
  return /_date$|^date$|_datetime$/.test(lower);
}

export function looksLikeJsonColumn(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith("_json") ||
    [
      "tags",
      "attachments",
      "artist_ids",
      "credits",
      "composers",
      "arrangers",
      "banking_details",
      "streaming_links",
      "social_media",
      "track_ids",
      "changes",
    ].includes(lower)
  );
}

export function looksLikeBoolColumn(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.startsWith("is_") ||
    [
      "exclusivity",
      "all_day",
      "pinned",
      "requires_user_review",
      "is_pre_restore_snapshot",
    ].includes(lower)
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function maskDatabaseUrl(url?: string): string {
  if (!url) return "(unset)";
  return url.replace(/:[^:@/]*@/, ":****@");
}
