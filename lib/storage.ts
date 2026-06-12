import { createHash } from "crypto";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import path from "path";

export interface StoredFile {
  url: string;
  filename: string;
  checksum: string;
  size_bytes: number;
  mime_type: string;
}

export interface StoreOptions {
  domain: "releases" | "contracts" | "office";
  entityId?: string | number;
  allowedMime?: string[];
  maxSizeBytes?: number;
}

const UPLOADS_BASE = "uploads";
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;
const MIME_RULES: Record<string, string[]> = {
  releases: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  contracts: ["application/pdf"],
  office: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ],
};

function computeChecksum(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_").slice(0, 200);
}

function buildStoragePath(domain: string, entityId?: string | number): string {
  const parts = [UPLOADS_BASE, domain];
  if (entityId !== undefined && entityId !== null) parts.push(String(entityId));
  return parts.join("/");
}

function buildFilename(entityPrefix: string, originalName: string): string {
  const ext = path.extname(originalName) || "";
  const base = path.basename(originalName, ext);
  const safe = sanitizeFilename(base);
  return `${entityPrefix}_${Date.now()}_${safe}${ext}`.toLowerCase();
}

function getDriver(): "local" | "s3" {
  return (process.env.STORAGE_DRIVER || "local") as "local" | "s3";
}

function isMimeAllowed(mime: string, domain: string): boolean {
  const rules = MIME_RULES[domain];
  if (!rules) return true;
  return rules.includes(mime);
}

async function storeLocal(
  buffer: Buffer,
  storagePath: string,
  filename: string
): Promise<string> {
  const fullDir = path.join(process.cwd(), "public", storagePath);
  await mkdir(fullDir, { recursive: true });
  const filePath = path.join(fullDir, filename);
  await writeFile(filePath, buffer);
  return `/${storagePath}/${filename}`;
}

async function deleteLocal(storagePath: string): Promise<void> {
  const fullPath = path.join(process.cwd(), "public", storagePath);
  await unlink(fullPath).catch(() => {});
}

async function storeS3(
  buffer: Buffer,
  storagePath: string,
  filename: string
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  const key = `${storagePath}/${filename}`;
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || "otto-cloud",
      Key: key,
      Body: buffer,
      ContentType: "application/octet-stream",
    })
  );
  const publicUrl = process.env.S3_PUBLIC_URL;
  return publicUrl ? `${publicUrl}/${key}` : `/${key}`;
}

async function deleteS3(storagePath: string): Promise<void> {
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET || "otto-cloud",
      Key: storagePath,
    })
  ).catch(() => {});
}

export async function storeFile(
  file: File,
  prefix: string,
  options: StoreOptions
): Promise<StoredFile> {
  const maxSize = options.maxSizeBytes || DEFAULT_MAX_SIZE;
  if (file.size > maxSize) {
    throw new Error(`File exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  if (options.allowedMime && !options.allowedMime.includes(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed for ${options.domain} uploads`);
  }

  if (!isMimeAllowed(file.type, options.domain)) {
    throw new Error(`File type "${file.type}" is not allowed for ${options.domain} uploads`);
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const checksum = computeChecksum(buffer);

  const storagePath = buildStoragePath(options.domain, options.entityId);
  const filename = buildFilename(prefix, file.name);

  let url: string;
  const driver = getDriver();
  if (driver === "s3") {
    url = await storeS3(buffer, storagePath, filename);
  } else {
    url = await storeLocal(buffer, storagePath, filename);
  }

  return {
    url,
    filename,
    checksum,
    size_bytes: file.size,
    mime_type: file.type,
  };
}

export async function deleteFile(storageUrl: string): Promise<void> {
  if (!storageUrl) return;
  const driver = getDriver();
  const relativePath = storageUrl.replace(/^\//, "");
  if (driver === "s3") {
    await deleteS3(relativePath);
  } else {
    await deleteLocal(relativePath);
  }
}

export async function getFileBuffer(storageUrl: string): Promise<Buffer | null> {
  if (!storageUrl) return null;
  const driver = getDriver();
  if (driver === "s3") {
    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "auto",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });
    const key = storageUrl.replace(/^\//, "");
    const result = await client.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET || "otto-cloud", Key: key })
    );
    const stream = result.Body as any;
    if (!stream) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }
  const fullPath = path.join(process.cwd(), "public", storageUrl.replace(/^\//, ""));
  return readFile(fullPath).catch(() => null);
}
