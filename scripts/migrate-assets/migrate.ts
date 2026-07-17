// @ts-nocheck
import Database from "better-sqlite3"; // @ts-ignore
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { resolveConfig, getInventoryPath, getStatePath, MigrateConfig } from "./config";
import {
  FileInventoryEntry,
  MigrationState,
  computeSHA256,
  detectMimeType,
  extractFilenameFromPath,
  writeJson,
  readJson,
  ensureDir,
  withRetry,
  sleep,
} from "./utils";
import { uploadFile, generateStorageKey, sanitizeFilename } from "@/lib/storage";
import { DEFAULT_FOLDER_NAMES } from "@/lib/storage/constants";

const prisma = new PrismaClient();

interface EntityMapping {
  localOrgId: number;
  cloudOrgId: string;
}

interface DbMappingEntry {
  localPath: string;
  table: string;
  column: string;
  recordId: string | number;
  entityType: string;
  entityId: string | number;
  orgId: number;
  originalValue: string;
}

const TABLE_FILE_COLUMNS: Array<{ table: string; column: string; entityType: string; folder: string; hasOrgColumn: boolean }> = [
  { table: "users", column: "avatar_url", entityType: "users", folder: DEFAULT_FOLDER_NAMES.avatars, hasOrgColumn: true },
  { table: "artists", column: "profile_image_url", entityType: "artists", folder: DEFAULT_FOLDER_NAMES.artists, hasOrgColumn: true },
  { table: "releases", column: "cover_art_url", entityType: "releases", folder: DEFAULT_FOLDER_NAMES.releases, hasOrgColumn: true },
  { table: "tracks", column: "file_location", entityType: "tracks", folder: DEFAULT_FOLDER_NAMES.songs, hasOrgColumn: false },
  { table: "tracks", column: "streaming_link", entityType: "tracks", folder: DEFAULT_FOLDER_NAMES.songs, hasOrgColumn: false },
  { table: "individuals", column: "image_url", entityType: "individuals", folder: DEFAULT_FOLDER_NAMES.misc, hasOrgColumn: false },
  { table: "labels", column: "logo_url", entityType: "labels", folder: DEFAULT_FOLDER_NAMES.misc, hasOrgColumn: false },
  { table: "documents", column: "file_path", entityType: "documents", folder: DEFAULT_FOLDER_NAMES.office, hasOrgColumn: true },
  { table: "contract_documents", column: "file_path", entityType: "contracts", folder: DEFAULT_FOLDER_NAMES.contracts, hasOrgColumn: true },
  { table: "office_documents", column: "storage_path", entityType: "office", folder: DEFAULT_FOLDER_NAMES.office, hasOrgColumn: true },
  { table: "works_admin_documents", column: "file_path", entityType: "works", folder: DEFAULT_FOLDER_NAMES.workspaces, hasOrgColumn: true },
  { table: "report_artifacts", column: "storage_path", entityType: "reports", folder: DEFAULT_FOLDER_NAMES.misc, hasOrgColumn: true },
];

export async function loadOrgMapping(config: MigrateConfig): Promise<EntityMapping[]> {
  const mappingPath = path.join(config.outputDir, "org-mapping.json");
  if (fs.existsSync(mappingPath)) {
    const raw = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
    return raw as EntityMapping[];
  }

  const sourceDb = new Database(config.localDbPath);
  try {
    const localOrgs = sourceDb.prepare('SELECT id, name FROM organizations WHERE id IS NOT NULL').all() as Array<{ id: number; name: string }>;

    if (localOrgs.length > 0) {
      const cloudOrgs = await prisma.organizations.findMany({
        select: { id: true, name: true },
      });

      if (cloudOrgs.length === 1 && localOrgs.length === 1) {
        console.log(`[migrate] Auto-mapping local org "${localOrgs[0].name}" → cloud org "${cloudOrgs[0].name}"`);
        return [{ localOrgId: localOrgs[0].id, cloudOrgId: cloudOrgs[0].id }];
      }

      const nameMap = new Map(cloudOrgs.map((o: any) => [o.name.toLowerCase(), o.id]));
      const mappings: EntityMapping[] = [];
      for (const localOrg of localOrgs) {
        const cloudId = nameMap.get(localOrg.name.toLowerCase());
        if (cloudId) {
          mappings.push({ localOrgId: localOrg.id, cloudOrgId: cloudId });
        } else {
          console.warn(`[migrate] No cloud org matched for local org "${localOrg.name}" (id=${localOrg.id})`);
        }
      }
      return mappings;
    }

    if (config.defaultCloudOrgId) {
      console.log(`[migrate] Using default cloud org: ${config.defaultCloudOrgId}`);
      return [{ localOrgId: 0, cloudOrgId: config.defaultCloudOrgId }];
    }

  const cloudOrgs = await prisma.organizations.findMany({
      select: { id: true, name: true },
    });

    if (cloudOrgs.length === 1) {
      console.log(`[migrate] No local orgs found. Using only cloud org: ${cloudOrgs[0].name}`);
      return [{ localOrgId: 0, cloudOrgId: cloudOrgs[0].id }];
    }

    console.warn("[migrate] No local organizations found and multiple cloud orgs exist. Use --default-org-id.");
    return [];
  } finally {
    sourceDb.close();
  }
}

export async function mapFilesToEntities(
  inventory: FileInventoryEntry[],
  config: MigrateConfig,
): Promise<{ mappings: DbMappingEntry[]; unmatched: string[] }> {
  const sourceDb = new Database(config.localDbPath);
  try {
    const localFilesMap = new Map<string, FileInventoryEntry>();
    for (const entry of inventory) {
      const filename = path.basename(entry.localPath).toLowerCase();
      const relPath = entry.relativePath.toLowerCase();
      localFilesMap.set(filename, entry);
      if (!localFilesMap.has(relPath)) {
        localFilesMap.set(relPath, entry);
      }
    }

    const mappings: DbMappingEntry[] = [];
    const matchedFiles = new Set<string>();

    for (const { table, column, entityType, folder, hasOrgColumn } of TABLE_FILE_COLUMNS) {
      try {
        const cols = hasOrgColumn ? `id, ${column}, organization_id` : `id, ${column}`;
        const rows = sourceDb.prepare(`SELECT ${cols} FROM "${table}" WHERE ${column} IS NOT NULL AND ${column} != ''`).all() as Array<any>;
        for (const row of rows) {
          const fileValue = String(row[column]);
          const filename = extractFilenameFromPath(fileValue).toLowerCase();
          const entry = localFilesMap.get(filename) || localFilesMap.get(fileValue.toLowerCase());

          if (entry) {
            mappings.push({
              localPath: entry.localPath,
              table,
              column,
              recordId: row.id,
              entityType,
              entityId: String(row.id),
              orgId: row.organization_id ?? 0,
              originalValue: fileValue,
            });
            matchedFiles.add(entry.localPath);
          } else {
            console.warn(`[migrate] Unmatched file reference: ${table}.${column} = ${fileValue}`);
          }
        }
      } catch (err) {
        console.warn(`[migrate] Could not query ${table}.${column}: ${(err as Error).message}`);
      }
    }

    const unmatched = inventory
      .map((e) => e.localPath)
      .filter((p) => !matchedFiles.has(p));

    return { mappings, unmatched };
  } finally {
    sourceDb.close();
  }
}

export async function loadState(config: MigrateConfig): Promise<MigrationState> {
  const statePath = getStatePath(config);
  return readJson<MigrationState>(statePath, {
    inventoryPath: getInventoryPath(config),
    totalFiles: 0,
    pending: [],
    uploaded: [],
    verified: [],
    failed: [],
    lastUpdated: new Date().toISOString(),
  });
}

export function saveState(state: MigrationState, config: MigrateConfig): void {
  state.lastUpdated = new Date().toISOString();
  writeJson(getStatePath(config), state);
}

export async function migrateAssets(config: MigrateConfig): Promise<void> {
  console.log(`[migrate] Mode: ${config.dryRun ? "DRY RUN" : "PRODUCTION"}`);
  console.log(`[migrate] Local DB: ${config.localDbPath}`);
  console.log(`[migrate] Local storage: ${config.localStorageRoot}`);
  console.log(`[migrate] Batch size: ${config.batchSize}, Concurrency: ${config.concurrency}`);

  const inventoryPath = getInventoryPath(config);
  if (!fs.existsSync(inventoryPath)) {
    console.error("[migrate] Inventory not found. Run discover first.");
    process.exit(1);
  }

  const inventory: FileInventoryEntry[] = readJson<FileInventoryEntry[]>(inventoryPath, []);
  if (inventory.length === 0) {
    console.log("[migrate] Inventory is empty. Nothing to migrate.");
    return;
  }

  const entityMappings = await loadOrgMapping(config);
  console.log(`[migrate] Found ${entityMappings.length} local organizations mapped to cloud`);

  if (entityMappings.length === 0) {
    console.warn("[migrate] No organization mappings found. Files without DB references will use 'misc' entity type.");
  }

  const { mappings, unmatched } = await mapFilesToEntities(inventory, config);
  console.log(`[migrate] Mapped ${mappings.length} files to database entities`);
  console.log(`[migrate] Unmatched files (will be orphaned): ${unmatched.length}`);

  let pendingEntries = inventory.filter((e) => e.status === "pending");

  if (config.pilotManifest) {
    const manifestPaths = new Set<string>();
    try {
      const manifestRaw = JSON.parse(fs.readFileSync(config.pilotManifest, "utf-8"));
      const manifestList = Array.isArray(manifestRaw) ? manifestRaw : manifestRaw.files || [];
      for (const item of manifestList) {
        const p = typeof item === "string" ? item : item.localPath || item.path;
        if (p) manifestPaths.add(p);
      }
      const before = pendingEntries.length;
      pendingEntries = pendingEntries.filter((e) => manifestPaths.has(e.localPath) || manifestPaths.has(e.relativePath));
      console.log(`[migrate] Manifest filter: ${pendingEntries.length}/${before} files selected`);
    } catch (err) {
      console.error(`[migrate] Failed to read manifest: ${(err as Error).message}`);
      process.exit(1);
    }
  }

  if (config.pilotEntity) {
    const entityLower = config.pilotEntity.toLowerCase();
    const allowed = new Set<string>();
    for (const m of mappings) {
      if (m.entityType.toLowerCase() === entityLower) {
        allowed.add(m.localPath);
      }
    }
    const before = pendingEntries.length;
    pendingEntries = pendingEntries.filter((e) => allowed.has(e.localPath));
    console.log(`[migrate] Entity filter "${config.pilotEntity}": ${pendingEntries.length}/${before} files selected`);
  }

  if (config.pilotLimit && config.pilotLimit > 0) {
    const before = pendingEntries.length;
    pendingEntries = pendingEntries.slice(0, config.pilotLimit);
    console.log(`[migrate] Limit ${config.pilotLimit}: ${pendingEntries.length}/${before} files selected`);
  }

  let state = await loadState(config);
  state.totalFiles = inventory.length;
  state.pending = pendingEntries.map((e) => e.localPath);
  saveState(state, config);

  const batches = chunkArray(pendingEntries, config.batchSize);

  let processed = 0;
  for (const batch of batches) {
    await processBatch(batch, mappings, entityMappings, config, state);
    processed += batch.length;
    console.log(`[migrate] Progress: ${processed}/${pendingEntries.length}`);
  }

  writeJson(inventoryPath, inventory);
  console.log("[migrate] Migration complete.");
}

async function processBatch(
  batch: FileInventoryEntry[],
  dbMappings: DbMappingEntry[],
  entityMappings: EntityMapping[],
  config: MigrateConfig,
  state: MigrationState,
): Promise<void> {
  const mappingMap = new Map(dbMappings.map((m) => [m.localPath, m]));
  const orgMap = new Map(entityMappings.map((m) => [m.localOrgId, m.cloudOrgId]));

  const workers: Promise<void>[] = [];
  const semaphore = new Array(config.concurrency).fill(null);

  for (let i = 0; i < batch.length; i++) {
    const entry = batch[i];
    const mapping = mappingMap.get(entry.localPath) || null;
    const entityMapping = mapping ? entityMappings.find((em) => em.localOrgId === mapping.orgId) || null : null;

    const worker = (async () => {
      try {
        await processSingleFile(entry, mapping, entityMapping, entityMappings, config);
        state.uploaded.push(entry.localPath);
        state.pending = state.pending.filter((p) => p !== entry.localPath);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        entry.status = "failed";
        entry.error = message;
        state.failed.push(entry.localPath);
        state.pending = state.pending.filter((p) => p !== entry.localPath);
        console.error(`[migrate] Failed: ${entry.relativePath} — ${message}`);
      } finally {
        saveState(state, config);
      }
    })();

    const semIdx = i % config.concurrency;
    if (semaphore[semIdx]) await semaphore[semIdx];
    semaphore[semIdx] = worker.then(() => {
      semaphore[semIdx] = null;
    });

    workers.push(worker);
  }

  await Promise.all(workers);
}

async function processSingleFile(
  entry: FileInventoryEntry,
  mapping: DbMappingEntry | null,
  entityMapping: EntityMapping | null,
  allEntityMappings: EntityMapping[],
  config: MigrateConfig,
): Promise<void> {
  if (!fs.existsSync(entry.localPath)) {
    throw new Error(`Local file missing: ${entry.localPath}`);
  }

  let cloudOrgId = entityMapping?.cloudOrgId;
  if (!cloudOrgId && allEntityMappings.length > 0) {
    cloudOrgId = allEntityMappings[0].cloudOrgId;
  }
  if (!cloudOrgId) {
    throw new Error(`No cloud organization mapping for file: ${entry.relativePath}`);
  }

  const entityType = mapping?.entityType ?? "misc";
  const entityId = mapping?.entityId ?? "orphan";
  const folder = mapping?.entityType ? getFolderForEntityType(mapping.entityType) : DEFAULT_FOLDER_NAMES.misc;

  const buffer = fs.readFileSync(entry.localPath);
  const originalName = path.basename(entry.localPath);
  const safeFileName = sanitizeFilename(originalName);

  if (config.dryRun) {
    console.log(`[dry-run] Would upload ${entry.relativePath} → org=${cloudOrgId} entity=${entityType}/${entityId}`);
    entry.status = "uploaded";
    entry.cloudOrgId = cloudOrgId;
    entry.entityType = entityType;
    entry.entityId = entityId;
    entry.storageKey = generateStorageKey({ organizationId: cloudOrgId, folder, fileName: safeFileName });
    entry.uploadDurationMs = 0;
    return;
  }

  const startTime = Date.now();
  const result = await withRetry(
    async () => {
      return uploadFile({
        body: buffer,
        organizationId: cloudOrgId,
        folder,
        fileName: originalName,
        mimeType: entry.mimeType,
      });
    },
    config.retryCount,
    config.retryDelayMs,
    `Upload ${entry.relativePath}`,
  );

  const uploadDurationMs = Date.now() - startTime;

  const attachment = await prisma.attachment.create({
    data: {
      organizationId: `${cloudOrgId}`,
      entityType,
      entityId,
      fileName: result.fileName,
      originalName,
      mimeType: result.mimeType,
      category: result.category,
      fileSize: result.fileSize,
      bucket: result.bucket,
      storageKey: result.key,
      checksum: entry.checksum,
      version: 1,
      uploadedBy: "migration",
    },
  });

  if (config.legacyUpdateFields && mapping) {
    try {
      await updateLegacyField(mapping, result.key);
    } catch (err) {
      console.warn(`[migrate] Could not update legacy field for ${entry.relativePath}: ${(err as Error).message}`);
    }
  }

  entry.status = "uploaded";
  entry.cloudOrgId = cloudOrgId;
  entry.entityType = entityType;
  entry.entityId = entityId;
  entry.storageKey = result.key;
  entry.attachmentId = attachment.id;
  entry.uploadDurationMs = uploadDurationMs;

  console.log(`[migrate] Uploaded ${entry.relativePath} → ${result.key} (${uploadDurationMs}ms, attachment=${attachment.id})`);
}

async function updateLegacyField(mapping: DbMappingEntry, storageKey: string): Promise<void> {
  const { table, column, recordId } = mapping;
  const id = recordId as any;

  switch (table) {
    case "users":
      await prisma.user.update({ where: { id }, data: { avatar_url: storageKey } });
      break;
    case "artists":
      await prisma.artists.update({ where: { id }, data: { profile_image_url: storageKey } });
      break;
    case "releases":
      await prisma.releases.update({ where: { id }, data: { cover_art_url: storageKey } });
      break;
    case "tracks":
      await prisma.tracks.update({ where: { id }, data: { [column]: storageKey } });
      break;
    case "individuals":
      await prisma.individuals.update({ where: { id }, data: { image_url: storageKey } });
      break;
    case "labels":
      await prisma.labels.update({ where: { id }, data: { logo_url: storageKey } });
      break;
    case "documents":
      await prisma.documents.update({ where: { id }, data: { file_path: storageKey } });
      break;
    case "contract_documents":
      await prisma.contract_documents.update({ where: { id }, data: { file_path: storageKey } });
      break;
    case "office_documents":
      await prisma.office_documents.update({ where: { id }, data: { storage_path: storageKey } });
      break;
    case "works_admin_documents":
      await prisma.works_admin_documents.update({ where: { id }, data: { file_path: storageKey } });
      break;
    case "report_artifacts":
      await prisma.report_artifacts.update({ where: { id }, data: { storage_path: storageKey } });
      break;
    default:
      console.warn(`[migrate] Unknown table for legacy update: ${table}`);
  }
}

function getFolderForEntityType(entityType: string): string {
  const folderMap: Record<string, string> = {
    users: DEFAULT_FOLDER_NAMES.avatars,
    artists: DEFAULT_FOLDER_NAMES.artists,
    releases: DEFAULT_FOLDER_NAMES.releases,
    tracks: DEFAULT_FOLDER_NAMES.songs,
    contracts: DEFAULT_FOLDER_NAMES.contracts,
    documents: DEFAULT_FOLDER_NAMES.office,
    office: DEFAULT_FOLDER_NAMES.office,
    individuals: DEFAULT_FOLDER_NAMES.misc,
    labels: DEFAULT_FOLDER_NAMES.misc,
    works: DEFAULT_FOLDER_NAMES.workspaces,
    reports: DEFAULT_FOLDER_NAMES.misc,
  };
  return folderMap[entityType] ?? DEFAULT_FOLDER_NAMES.misc;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
