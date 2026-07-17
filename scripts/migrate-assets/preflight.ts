// @ts-nocheck
import http from "http";
import https from "https";
import dns from "dns";
import Database from "better-sqlite3"; // @ts-ignore
import { PrismaClient } from "@prisma/client";
import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

import { resolveConfig, getInventoryPath, getStatePath, MigrateConfig } from "./config";
import { formatBytes, readJson, writeJson, ensureDir } from "./utils";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
];

const EXPECTED_TABLES = [
  "users",
  "artists",
  "releases",
  "tracks",
  "documents",
  "contract_documents",
  "office_documents",
  "works_admin_documents",
  "report_artifacts",
];

interface PreflightResult {
  check: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: string;
}

interface PreflightReport {
  passed: boolean;
  results: PreflightResult[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  filesDiscovered?: number;
  estimatedUploadBytes?: number;
  organizationName?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpsRequest(url: string, timeoutMs = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.get(url, { method: "HEAD", timeout: timeoutMs }, (res) => {
      resolve(res.statusCode < 500);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function dnsResolve(host: string): Promise<string[]> {
  return new Promise((resolve) => {
    dns.resolve(host, (err, addresses) => {
      if (err) resolve([]);
      else resolve(addresses);
    });
  });
}

async function checkEnvironment(): Promise<PreflightResult> {
  const missing = REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return !value || value.trim() === "";
  });

  if (missing.length > 0) {
    return {
      check: "Environment",
      status: "fail",
      message: `Missing required environment variables`,
      details: missing.join(", "),
    };
  }

  return {
    check: "Environment",
    status: "pass",
    message: "All required environment variables are set",
  };
}

async function checkPrisma(): Promise<PreflightResult> {
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();

    return {
      check: "Prisma",
      status: "pass",
      message: "Connected successfully, query test passed",
    };
  } catch (err) {
    return {
      check: "Prisma",
      status: "fail",
      message: `Prisma connectivity failed`,
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkAttachmentTable(): Promise<PreflightResult> {
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();

    const count = await prisma.attachment.count();
    await prisma.$disconnect();

    return {
      check: "Attachment Table",
      status: "pass",
      message: `Table exists and is readable (${count} records)`,
    };
  } catch (err) {
    return {
      check: "Attachment Table",
      status: "fail",
      message: `Attachment table check failed`,
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkR2(config: MigrateConfig): Promise<PreflightResult> {
  const errors: string[] = [];

  try {
    const endpoint = process.env.R2_ENDPOINT?.replace(/\/$/, "") || "";
    const bucket = process.env.R2_BUCKET_NAME || "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return {
        check: "R2",
        status: "fail",
        message: "Missing R2 credentials",
      };
    }

    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    const headCmd = new HeadBucketCommand({ Bucket: bucket });
    await client.send(headCmd);

    const tempKey = `preflight-${Date.now()}-${crypto.randomUUID()}.tmp`;
    const tempBody = Buffer.from("preflight-test");

    const putCmd = new PutObjectCommand({
      Bucket: bucket,
      Key: tempKey,
      Body: tempBody,
      ContentType: "application/octet-stream",
    });
    await client.send(putCmd);

    const delCmd = new DeleteObjectCommand({
      Bucket: bucket,
      Key: tempKey,
    });
    await client.send(delCmd);

    return {
      check: "R2",
      status: "pass",
      message: `Bucket "${bucket}" accessible, write/delete verified`,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    errors.push(detail);
    return {
      check: "R2",
      status: "fail",
      message: "R2 validation failed",
      details: errors.join("; "),
    };
  }
}

async function checkStorageService(config: MigrateConfig): Promise<PreflightResult> {
  const errors: string[] = [];

  try {
    const endpoint = process.env.R2_ENDPOINT?.replace(/\/$/, "") || "";
    const bucket = process.env.R2_BUCKET_NAME || "";
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

    const client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    const orgId = "00000000-0000-0000-0000-000000000001";
    const tempKey = `organizations/${orgId}/misc/preflight-${Date.now()}-${crypto.randomUUID()}.tmp`;
    const tempBody = Buffer.from("preflight-test");

    const putCmd = new PutObjectCommand({
      Bucket: bucket,
      Key: tempKey,
      Body: tempBody,
      ContentType: "application/octet-stream",
    });
    await client.send(putCmd);

    const getCmd = new GetObjectCommand({
      Bucket: bucket,
      Key: tempKey,
    });
    const signedUrl = await getSignedUrl(client, getCmd, { expiresIn: 60 });

    if (!signedUrl || signedUrl.length === 0) {
      throw new Error("Failed to generate signed download URL");
    }

    const delCmd = new DeleteObjectCommand({
      Bucket: bucket,
      Key: tempKey,
    });
    await client.send(delCmd);

    return {
      check: "Storage Service",
      status: "pass",
      message: "uploadFile, getSignedDownloadUrl, deleteFile verified",
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    errors.push(detail);
    return {
      check: "Storage Service",
      status: "fail",
      message: "Storage service validation failed",
      details: errors.join("; "),
    };
  }
}

async function checkSqlite(config: MigrateConfig): Promise<PreflightResult> {
  const errors: string[] = [];
  const missingTables: string[] = [];

  try {
    if (!fs.existsSync(config.localDbPath)) {
      return {
        check: "SQLite",
        status: "fail",
        message: `Local database not found`,
        details: config.localDbPath,
      };
    }

    const db = new Database(config.localDbPath);
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    const existingTables = new Set(row.map((r) => r.name));

    for (const table of EXPECTED_TABLES) {
      if (!existingTables.has(table)) {
        missingTables.push(table);
      }
    }

    db.close();

    if (missingTables.length > 0) {
      return {
        check: "SQLite",
        status: "warn",
        message: `Database exists but missing tables`,
        details: missingTables.join(", "),
      };
    }

    return {
      check: "SQLite",
      status: "pass",
      message: `Database exists, all expected tables present`,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    errors.push(detail);
    return {
      check: "SQLite",
      status: "fail",
      message: "SQLite validation failed",
      details: errors.join("; "),
    };
  }
}

async function checkLocalStorage(config: MigrateConfig): Promise<PreflightResult> {
  try {
    if (!fs.existsSync(config.localStorageRoot)) {
      return {
        check: "Local Storage",
        status: "fail",
        message: `Storage root not found`,
        details: config.localStorageRoot,
      };
    }

    let dirCount = 0;
    let fileCount = 0;
    let totalBytes = 0;

    function walk(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          dirCount++;
          walk(fullPath);
        } else if (entry.isFile()) {
          fileCount++;
          try {
            const stats = fs.statSync(fullPath);
            totalBytes += stats.size;
          } catch {
            // skip unreadable files
          }
        }
      }
    }

    walk(config.localStorageRoot);

    return {
      check: "Local Storage",
      status: "pass",
      message: `${fileCount} files across ${dirCount} directories (${formatBytes(totalBytes)})`,
      details: config.localStorageRoot,
    };
  } catch (err) {
    return {
      check: "Local Storage",
      status: "fail",
      message: "Local storage validation failed",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkOrganization(config: MigrateConfig): Promise<PreflightResult> {
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();

    const defaultOrgId = config.defaultCloudOrgId;

    if (defaultOrgId) {
      const orgId = parseInt(defaultOrgId, 10);
      if (isNaN(orgId)) {
        await prisma.$disconnect();
        return {
          check: "Organization",
          status: "fail",
          message: "Invalid --default-org-id (expected integer)",
          details: defaultOrgId,
        };
      }
      const org = await prisma.organizations.findFirst({
        where: { id: orgId },
        select: { id: true, name: true },
      });
      await prisma.$disconnect();

      if (!org) {
        return {
          check: "Organization",
          status: "fail",
          message: `Default organization not found`,
          details: `id=${orgId}`,
        };
      }

      return {
        check: "Organization",
        status: "pass",
        message: `Organization found: ${org.name}`,
      };
    }

    const count = await prisma.organizations.count();
    await prisma.$disconnect();

    if (count === 0) {
      return {
        check: "Organization",
        status: "fail",
        message: "No organizations found in cloud database",
      };
    }

    const orgs = await prisma.organizations.findMany({ select: { id: true, name: true } });
    if (orgs.length === 1) {
      return {
        check: "Organization",
        status: "pass",
        message: `Single org found: ${orgs[0].name}`,
      };
    }

    return {
      check: "Organization",
      status: "warn",
      message: `Multiple organizations found (${orgs.length}). Use --default-org-id to specify.`,
      details: orgs.map((o) => `${o.id}: ${o.name}`).join(", "),
    };
  } catch (err) {
    return {
      check: "Organization",
      status: "fail",
      message: "Organization validation failed",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkDiskSpace(config: MigrateConfig): Promise<PreflightResult> {
  try {
    let totalBytes = 0;

    if (fs.existsSync(config.localStorageRoot)) {
      function walk(dir: string): void {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile()) {
            try {
              totalBytes += fs.statSync(fullPath).size;
            } catch {
              // skip
            }
          }
        }
      }
      walk(config.localStorageRoot);
    }

    const inventoryPath = getInventoryPath(config);
    if (fs.existsSync(inventoryPath)) {
      const inventory = readJson<any[]>(inventoryPath, []);
      totalBytes = inventory.reduce((sum, entry) => sum + (entry.size || 0), 0);
    }

    let availableBytes = 0;
    try {
      availableBytes = getAvailableDiskSpace();
    } catch {
      availableBytes = 0;
    }

    const warnThreshold = 0.1;
    const criticalThreshold = 0.05;

    if (availableBytes === 0) {
      return {
        check: "Disk Space",
        status: "warn",
        message: `Could not determine available disk space. Estimated upload: ${formatBytes(totalBytes)}`,
      };
    }

    if (totalBytes > 0 && availableBytes < totalBytes * criticalThreshold) {
      return {
        check: "Disk Space",
        status: "fail",
        message: `Critically low disk space`,
        details: `Available: ${formatBytes(availableBytes)}, Estimated upload: ${formatBytes(totalBytes)}`,
      };
    }

    if (totalBytes > 0 && availableBytes < totalBytes * warnThreshold) {
      return {
        check: "Disk Space",
        status: "warn",
        message: `Low disk space`,
        details: `Available: ${formatBytes(availableBytes)}, Estimated upload: ${formatBytes(totalBytes)}`,
      };
    }

    return {
      check: "Disk Space",
      status: "pass",
      message: `Sufficient disk space. Estimated upload: ${formatBytes(totalBytes)}`,
      details: `Available: ${formatBytes(availableBytes)}`,
    };
  } catch (err) {
    return {
      check: "Disk Space",
      status: "warn",
      message: "Could not verify disk space",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

function getAvailableDiskSpace(): number {
  if (process.platform === "win32") {
    try {
      const { execSync } = require("child_process");
      const output = execSync("wmic logicaldisk get size,freespace,caption", { encoding: "utf8" });
      const lines = output.split("\n").filter((l: string) => l.trim());
      for (const line of lines.slice(1)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3 && parts[0].includes(":")) {
          const freeSpace = parseInt(parts[1], 10);
          if (!isNaN(freeSpace)) return freeSpace;
        }
      }
    } catch {
      return 0;
    }
    return 0;
  }

  try {
    const { execSync } = require("child_process");
    const output = execSync("df -P . | tail -1", { encoding: "utf8" });
    const parts = output.trim().split(/\s+/);
    if (parts.length >= 4) {
      const availableBlocks = parseInt(parts[3], 10);
      if (!isNaN(availableBlocks)) {
        return availableBlocks * 1024;
      }
    }
  } catch {
    return 0;
  }

  return 0;
}

async function checkNetwork(): Promise<PreflightResult> {
  const errors: string[] = [];
  const checks: Array<{ name: string; host: string; url: string }> = [];

  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const dbHostMatch = dbUrl.match(/@([^:/]+)/);
    if (dbHostMatch) {
      checks.push({ name: "Neon DB", host: dbHostMatch[1], url: `https://${dbHostMatch[1]}` });
    }
  } catch {
    // skip
  }

  try {
    const r2Endpoint = process.env.R2_ENDPOINT || "";
    const r2HostMatch = r2Endpoint.match(/https?:\/\/([^/]+)/);
    if (r2HostMatch) {
      checks.push({ name: "Cloudflare R2", host: r2HostMatch[1], url: r2Endpoint });
    }
  } catch {
    // skip
  }

  if (checks.length === 0) {
    return {
      check: "Network",
      status: "warn",
      message: "Could not determine network endpoints from environment",
    };
  }

  for (const check of checks) {
    try {
      const addresses = await dnsResolve(check.host);
      if (addresses.length === 0) {
        errors.push(`${check.name}: DNS resolution failed for ${check.host}`);
      }

      const reachable = await httpsRequest(check.url, 10000);
      if (!reachable) {
        errors.push(`${check.name}: HTTPS connection failed to ${check.url}`);
      }
    } catch (err) {
      errors.push(`${check.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (errors.length > 0) {
    return {
      check: "Network",
      status: "warn",
      message: "Some network checks had issues",
      details: errors.join("; "),
    };
  }

  return {
    check: "Network",
    status: "pass",
    message: "DNS resolution and HTTPS connectivity verified",
  };
}

async function checkMigrationState(config: MigrateConfig): Promise<PreflightResult> {
  try {
    const statePath = getStatePath(config);
    if (!fs.existsSync(statePath)) {
      return {
        check: "Migration State",
        status: "pass",
        message: "No existing migration state (fresh start)",
      };
    }

    const state = readJson<any>(statePath, null);
    if (!state) {
      return {
        check: "Migration State",
        status: "warn",
        message: "Migration state file exists but is invalid",
      };
    }

    const pending = state.pending?.length || 0;
    const uploaded = state.uploaded?.length || 0;
    const verified = state.verified?.length || 0;
    const failed = state.failed?.length || 0;

    return {
      check: "Migration State",
      status: "warn",
      message: `Existing state found — resume recommended`,
      details: `Pending: ${pending}, Uploaded: ${uploaded}, Verified: ${verified}, Failed: ${failed}. Last updated: ${state.lastUpdated || "unknown"}`,
    };
  } catch (err) {
    return {
      check: "Migration State",
      status: "warn",
      message: "Could not read migration state",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkInventory(config: MigrateConfig): Promise<PreflightResult> {
  try {
    const inventoryPath = getInventoryPath(config);
    if (!fs.existsSync(inventoryPath)) {
      return {
        check: "Inventory",
        status: "pass",
        message: "No existing inventory (will be created during discover)",
      };
    }

    const inventory = readJson<any[]>(inventoryPath, []);
    const stats = fs.statSync(inventoryPath);
    const totalSize = inventory.reduce((sum, entry) => sum + (entry.size || 0), 0);

    const fileCounts = inventory.length;
    const now = new Date();
    const ageHours = (now.getTime() - stats.mtimeMs) / (1000 * 60 * 60);

    let staleWarning = "";
    if (ageHours > 24) {
      staleWarning = ` WARNING: Inventory is ${Math.round(ageHours)}h old`;
    }

    return {
      check: "Inventory",
      status: "warn",
      message: `Existing inventory found: ${fileCounts} files, ${formatBytes(totalSize)}${staleWarning}`,
      details: `Created: ${stats.mtime.toISOString()}`,
    };
  } catch (err) {
    return {
      check: "Inventory",
      status: "warn",
      message: "Could not read inventory",
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

async function runPreflight(config: MigrateConfig): Promise<PreflightReport> {
  const results: PreflightResult[] = [];

  results.push(await checkEnvironment());
  results.push(await checkPrisma());
  results.push(await checkAttachmentTable());
  results.push(await checkR2(config));
  results.push(await checkStorageService(config));
  results.push(await checkSqlite(config));
  results.push(await checkLocalStorage(config));
  results.push(await checkOrganization(config));
  results.push(await checkDiskSpace(config));
  results.push(await checkNetwork());
  results.push(await checkMigrationState(config));
  results.push(await checkInventory(config));

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const warnings = results.filter((r) => r.status === "warn").length;

  const passedReport = failed === 0;

  let filesDiscovered: number | undefined;
  let estimatedUploadBytes: number | undefined;
  let organizationName: string | undefined;

  const inventoryPath = getInventoryPath(config);
  if (fs.existsSync(inventoryPath)) {
    const inventory = readJson<any[]>(inventoryPath, []);
    filesDiscovered = inventory.length;
    estimatedUploadBytes = inventory.reduce((sum, entry) => sum + (entry.size || 0), 0);
  }

  const orgResult = results.find((r) => r.check === "Organization");
  if (orgResult?.status === "pass") {
    const nameMatch = orgResult.message.match(/:\s*(.+)$/);
    organizationName = nameMatch ? nameMatch[1] : undefined;
  }

  return {
    passed: passedReport,
    results,
    summary: { totalChecks: results.length, passed, failed, warnings },
    filesDiscovered,
    estimatedUploadBytes,
    organizationName,
  };
}

function printReport(report: PreflightReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("Otto Cloud — Asset Migration Preflight");
  console.log("=".repeat(60));

  console.log(`\n| Check             | Result |`);
  console.log(`| ----------------- | ------ |`);

  for (const result of report.results) {
    const icon = result.status === "pass" ? "✅" : result.status === "warn" ? "⚠️" : "❌";
    const message = result.message.length > 50 ? result.message.slice(0, 47) + "..." : result.message;
    console.log(`| ${result.check.padEnd(18)} | ${icon.padEnd(6)} | ${message}`);
    if (result.details && result.status !== "pass") {
      const details = result.details.length > 50 ? result.details.slice(0, 47) + "..." : result.details;
      console.log(`| ${"".padEnd(18)} | ${"".padEnd(6)} | ${details}`);
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log(`Summary: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warnings} warnings`);

  if (report.filesDiscovered !== undefined) {
    console.log(`Files discovered: ${report.filesDiscovered.toLocaleString()}`);
  }
  if (report.estimatedUploadBytes !== undefined) {
    console.log(`Estimated upload: ${formatBytes(report.estimatedUploadBytes)}`);
  }
  if (report.organizationName) {
    console.log(`Organization: ${report.organizationName}`);
  }

  if (report.passed) {
    console.log("\n✅ Preflight PASSED");
    console.log("\nReady to begin migration.");
  } else {
    console.log(`\n❌ Preflight FAILED`);
    console.log(`${report.summary.failed} critical issue(s) found. Migration aborted.`);
  }
  console.log("=".repeat(60) + "\n");

  for (const result of report.results) {
    if (result.status === "fail") {
      console.error(`\n[${result.check}] ${result.message}`);
      if (result.details) {
        console.error(`  Details: ${result.details}`);
      }
    }
  }
}

export async function runPreflightCheck(configOverride?: Partial<MigrateConfig>): Promise<PreflightReport> {
  const config = resolveConfig(configOverride || { mode: "discover" });
  const report = await runPreflight(config);
  printReport(report);
  return report;
}

export async function requirePreflight(configOverride?: Partial<MigrateConfig>): Promise<PreflightReport> {
  const report = await runPreflightCheck(configOverride);
  if (!report.passed) {
    process.exit(1);
  }
  return report;
}
