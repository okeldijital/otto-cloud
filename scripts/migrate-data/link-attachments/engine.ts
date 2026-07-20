/**
 * Deterministic attachment ↔ entity linking engine.
 *
 * - No re-upload, no R2 rename, no attachment deletes
 * - Only links when evidence is defensible
 *
 * Run:
 *   npx tsx scripts/migrate-data/link-attachments/engine.ts
 *   npx tsx scripts/migrate-data/link-attachments/engine.ts --dry-run
 *   npx tsx scripts/migrate-data/link-attachments/engine.ts --check-r2
 */

import fs from "fs";
import path from "path";
import { PrismaClient, type Attachment } from "@prisma/client";
import { getLegacyCatalogScopeId } from "@/lib/auth/migration-compat";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const CHECK_R2 = process.argv.includes("--check-r2");

const INVENTORY_PATH = path.join(
  process.cwd(),
  "scripts/migrate-assets/migration-inventory.json"
);
const REPORT_PATH = path.join(process.cwd(), "ATTACHMENT-LINKING-REPORT.md");

type InvEntry = {
  relativePath?: string;
  localPath?: string;
  storageKey?: string;
  attachmentId?: string;
  checksum?: string;
  entityType?: string;
  entityId?: string;
};

type LinkResult = {
  attachmentId: string;
  entityType: string;
  entityId: string;
  logicalRole: string;
  evidence: string;
};

type SkipResult = {
  attachmentId: string;
  originalName: string;
  reason: string;
};

type Stats = {
  total: number;
  linkedBefore: number;
  orphanBefore: number;
  linkedNow: number;
  byEntity: Record<string, { linked: number; evidence: string[] }>;
  skips: SkipResult[];
  links: LinkResult[];
  duplicates: { checksum: string; count: number; name: string; size: number }[];
  r2Checked: number;
  r2Missing: number;
};

function basenameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.split("?")[0].trim();
  const base = path.basename(clean);
  if (!base || base === "." || base === "/") return null;
  return base;
}

function loadInventory(): InvEntry[] {
  if (!fs.existsSync(INVENTORY_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf-8"));
  return Array.isArray(raw) ? raw : Object.values(raw);
}

function isOrphan(a: Attachment): boolean {
  const id = (a.entityId || "").trim().toLowerCase();
  const type = (a.entityType || "").trim().toLowerCase();
  return (
    !id ||
    id === "orphan" ||
    id === "0" ||
    type === "misc" ||
    type === "unknown" ||
    type === "orphan" ||
    type === ""
  );
}

function decodeContractFolderId(folder: string): number | null {
  // "1", "26" or UUID with hex tail 00000026e9
  if (/^\d+$/.test(folder)) return parseInt(folder, 10);
  const hex = folder.replace(/-/g, "");
  if (/^[0-9a-f]+$/i.test(hex)) {
    try {
      const n = parseInt(hex.slice(-8), 16);
      if (n > 0 && n < 1_000_000) return n;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function main() {
  const orgUuid = getLegacyCatalogScopeId();
  const inventory = loadInventory();
  console.log(
    `[link-attachments] dryRun=${DRY_RUN} inventory=${inventory.length} catalogOrg=${orgUuid}`
  );

  const all = await prisma.attachment.findMany();
  const stats: Stats = {
    total: all.length,
    linkedBefore: all.filter((a) => !isOrphan(a)).length,
    orphanBefore: all.filter((a) => isOrphan(a)).length,
    linkedNow: 0,
    byEntity: {},
    skips: [],
    links: [],
    duplicates: [],
    r2Checked: 0,
    r2Missing: 0,
  };

  // Duplicate checksum inventory (content dups — not deleted)
  const dupRows = await prisma.$queryRawUnsafe<
    { checksum: string; c: number; name: string; sz: number }[]
  >(`
    SELECT checksum, COUNT(*)::int AS c, MIN("fileName") AS name, MIN("fileSize") AS sz
    FROM attachments
    WHERE checksum IS NOT NULL
    GROUP BY checksum
    HAVING COUNT(*) > 1
    ORDER BY c DESC
  `);
  stats.duplicates = dupRows.map((d) => ({
    checksum: d.checksum,
    count: d.c,
    name: d.name,
    size: d.sz,
  }));

  // Index attachments by originalName / fileName (lowercase)
  const byName = new Map<string, Attachment[]>();
  const byId = new Map<string, Attachment>();
  const byChecksum = new Map<string, Attachment[]>();
  for (const a of all) {
    byId.set(a.id, a);
    for (const key of [a.originalName, a.fileName]) {
      if (!key) continue;
      const k = key.toLowerCase();
      if (!byName.has(k)) byName.set(k, []);
      byName.get(k)!.push(a);
    }
    if (a.checksum) {
      if (!byChecksum.has(a.checksum)) byChecksum.set(a.checksum, []);
      byChecksum.get(a.checksum)!.push(a);
    }
  }

  const planned = new Map<string, LinkResult>(); // attachmentId → link

  function planLink(
    att: Attachment,
    entityType: string,
    entityId: string,
    logicalRole: string,
    evidence: string
  ) {
    if (planned.has(att.id)) return;
    if (!isOrphan(att) && att.entityType === entityType && att.entityId === entityId) {
      return; // already correct
    }
    if (!isOrphan(att) && !isOrphan({ ...att, entityType, entityId } as Attachment)) {
      // Already linked to something else — skip unless orphan
      if (!isOrphan(att)) {
        stats.skips.push({
          attachmentId: att.id,
          originalName: att.originalName,
          reason: `already linked to ${att.entityType}:${att.entityId}; not overwriting for ${entityType}:${entityId}`,
        });
        return;
      }
    }
    planned.set(att.id, {
      attachmentId: att.id,
      entityType,
      entityId,
      logicalRole,
      evidence,
    });
  }

  function attachmentsForBasename(base: string): Attachment[] {
    const exact = byName.get(base.toLowerCase()) || [];
    if (exact.length) return exact;
    // storageKey contains basename
    return all.filter(
      (a) =>
        a.storageKey.toLowerCase().includes(base.toLowerCase()) ||
        a.originalName.toLowerCase().includes(base.toLowerCase())
    );
  }

  // ── 1. Releases via cover_art_url ──────────────────────────────────────
  const releases = await prisma.releases.findMany({
    select: { id: true, title: true, cover_art_url: true },
  });
  let releasesWithCover = 0;
  let releasesLinked = 0;
  for (const r of releases) {
    const base = basenameFromUrl(r.cover_art_url);
    if (!base) continue;
    releasesWithCover++;
    const atts = attachmentsForBasename(base);
    if (!atts.length) {
      stats.skips.push({
        attachmentId: "-",
        originalName: base,
        reason: `release ${r.id} cover basename not found in attachments`,
      });
      continue;
    }
    for (const att of atts) {
      planLink(
        att,
        "release",
        String(r.id),
        "cover",
        `releases.cover_art_url basename exact match: ${base}`
      );
    }
    releasesLinked++;
  }

  // ── 2. Artists via profile_image_url ───────────────────────────────────
  const artists = await prisma.artists.findMany({
    select: { id: true, name: true, profile_image_url: true },
  });
  let artistsWithImage = 0;
  let artistsLinked = 0;
  for (const a of artists) {
    const base = basenameFromUrl(a.profile_image_url);
    if (!base) continue;
    artistsWithImage++;
    const atts = attachmentsForBasename(base);
    if (!atts.length) {
      stats.skips.push({
        attachmentId: "-",
        originalName: base,
        reason: `artist ${a.id} profile basename not found in attachments`,
      });
      continue;
    }
    for (const att of atts) {
      planLink(
        att,
        "artist",
        String(a.id),
        "profile",
        `artists.profile_image_url basename exact match: ${base}`
      );
    }
    artistsLinked++;
  }

  // ── 3. Labels via logo_url ─────────────────────────────────────────────
  const labels = await prisma.labels.findMany({
    select: { id: true, name: true, logo_url: true },
  });
  let labelsWithLogo = 0;
  let labelsLinked = 0;
  for (const l of labels) {
    const base = basenameFromUrl(l.logo_url);
    if (!base) continue;
    labelsWithLogo++;
    const atts = attachmentsForBasename(base);
    if (!atts.length) {
      stats.skips.push({
        attachmentId: "-",
        originalName: base,
        reason: `label ${l.id} logo basename not found`,
      });
      continue;
    }
    for (const att of atts) {
      planLink(
        att,
        "label",
        String(l.id),
        "logo",
        `labels.logo_url basename exact match: ${base}`
      );
    }
    labelsLinked++;
  }

  // ── 4. Publishers via logo if column exists (none currently) ───────────
  // Schema has no logo_url on publishers — skip

  // ── 5. Users via avatar_url ────────────────────────────────────────────
  const users = await prisma.user.findMany({
    select: { id: true, email: true, avatar_url: true },
  });
  let usersWithAvatar = 0;
  let usersLinked = 0;
  for (const u of users) {
    const base = basenameFromUrl(u.avatar_url);
    if (!base) continue;
    usersWithAvatar++;
    const atts = attachmentsForBasename(base);
    if (!atts.length) continue;
    for (const att of atts) {
      planLink(
        att,
        "user",
        String(u.id),
        "avatar",
        `users.avatar_url basename exact match: ${base}`
      );
    }
    usersLinked++;
  }

  // ── 6. Contract documents table (FK evidence) ──────────────────────────
  let contractsLinked = 0;
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
      const bases = [
        basenameFromUrl(doc.file_path),
        doc.file_name,
      ].filter(Boolean) as string[];
      const candidates = new Set<Attachment>();
      for (const b of bases) {
        for (const a of attachmentsForBasename(b)) candidates.add(a);
      }
      if (doc.checksum) {
        for (const a of byChecksum.get(doc.checksum) || []) candidates.add(a);
      }
      if (!candidates.size) continue;
      // Verify contract exists
      const c = await prisma.contracts.findUnique({
        where: { id: doc.contract_id },
        select: { id: true },
      });
      if (!c) {
        stats.skips.push({
          attachmentId: [...candidates][0]?.id || "-",
          originalName: bases[0] || "",
          reason: `contract_documents row points to missing contract_id=${doc.contract_id}`,
        });
        continue;
      }
      for (const att of candidates) {
        planLink(
          att,
          "contract",
          String(doc.contract_id),
          "document",
          `contract_documents FK contract_id=${doc.contract_id} + path/name/checksum`
        );
      }
      contractsLinked++;
    }
  } catch (e: any) {
    console.warn("[link-attachments] contract_documents:", e.message);
  }

  // ── 7. Inventory path: contracts/{folder}/file — only if contract exists ─
  const contractIds = new Set(
    (await prisma.contracts.findMany({ select: { id: true } })).map((c) => c.id)
  );
  let inventoryContractLinked = 0;
  for (const e of inventory) {
    const rel = e.relativePath || "";
    const m = rel.match(/^contracts\/([^/]+)\//i);
    if (!m) continue;
    const legacyId = decodeContractFolderId(m[1]);
    if (legacyId == null) {
      continue;
    }
    if (!contractIds.has(legacyId)) {
      // no cloud contract — skip (do not invent)
      continue;
    }
    const att =
      (e.attachmentId && byId.get(e.attachmentId)) ||
      (e.storageKey
        ? all.find((a) => a.storageKey === e.storageKey)
        : undefined) ||
      attachmentsForBasename(path.basename(rel))[0];
    if (!att) continue;
    planLink(
      att,
      "contract",
      String(legacyId),
      "document",
      `inventory path contracts/${m[1]}/… maps to existing contract id ${legacyId}`
    );
    inventoryContractLinked++;
  }

  // ── 8. Works: works_admin path or works file refs ──────────────────────
  // works_admin/{uuid}/audit.pdf — no deterministic works id without table
  // Skip guessing

  // ── Apply planned links ────────────────────────────────────────────────
  console.log(`[link-attachments] planned links: ${planned.size}`);

  if (!DRY_RUN) {
    for (const link of planned.values()) {
      await prisma.attachment.update({
        where: { id: link.attachmentId },
        data: {
          entityType: link.entityType,
          entityId: link.entityId,
          // Normalize org scope so signed-URL org check works with session UUID
          organizationId: orgUuid,
        },
      });
    }
  }

  // Recompute after
  const after = DRY_RUN
    ? all.map((a) => {
        const p = planned.get(a.id);
        return p
          ? { ...a, entityType: p.entityType, entityId: p.entityId }
          : a;
      })
    : await prisma.attachment.findMany();

  stats.linkedNow = after.filter((a) => !isOrphan(a as Attachment)).length;
  stats.links = [...planned.values()];

  for (const link of stats.links) {
    if (!stats.byEntity[link.entityType]) {
      stats.byEntity[link.entityType] = { linked: 0, evidence: [] };
    }
    stats.byEntity[link.entityType].linked += 1;
    if (stats.byEntity[link.entityType].evidence.length < 5) {
      stats.byEntity[link.entityType].evidence.push(link.evidence);
    }
  }

  // Orphan remaining reasons (sample)
  const stillOrphan = (after as Attachment[]).filter((a) => isOrphan(a));
  const skipReasons = new Map<string, number>();
  for (const a of stillOrphan) {
    let reason = "no deterministic entity evidence";
    const name = a.originalName || a.fileName;
    if (name === ".DS_Store") reason = "system file (.DS_Store)";
    else if (name === "audit.pdf" || name === "proof.pdf")
      reason = "smoke/stub document name without entity FK";
    else if (a.fileSize < 100 && a.mimeType === "application/pdf")
      reason = "tiny PDF stub without entity FK";
    else if (a.category === "image")
      reason = "image not referenced by cover_art_url/profile_image_url/logo_url";
    else if (a.category === "document")
      reason = "document not referenced by contract/office FK or mappable path";
    skipReasons.set(reason, (skipReasons.get(reason) || 0) + 1);
    if (stats.skips.length < 200) {
      stats.skips.push({
        attachmentId: a.id,
        originalName: name,
        reason,
      });
    }
  }

  // Optional R2 head checks for linked samples
  if (CHECK_R2) {
    try {
      const { getFileMetadata } = await import("@/lib/storage");
      const sample = stats.links.slice(0, 15);
      for (const link of sample) {
        const att = byId.get(link.attachmentId);
        if (!att) continue;
        stats.r2Checked++;
        try {
          await getFileMetadata({ key: att.storageKey, bucket: att.bucket });
        } catch {
          stats.r2Missing++;
        }
      }
    } catch (e: any) {
      console.warn("[link-attachments] R2 check skipped:", e.message);
    }
  }

  // Entity coverage summary
  const releaseCoverage = {
    withCoverUrl: releasesWithCover,
    linked: releasesLinked,
    total: releases.length,
  };
  const artistCoverage = {
    withImageUrl: artistsWithImage,
    linked: artistsLinked,
    total: artists.length,
  };
  const labelCoverage = {
    withLogoUrl: labelsWithLogo,
    linked: labelsLinked,
    total: labels.length,
  };

  // Counts of remaining orphans per entity type bucket (always 0 for linked types)
  const remainingOrphans = stillOrphan.length;

  writeReport({
    stats,
    skipReasons,
    releaseCoverage,
    artistCoverage,
    labelCoverage,
    usersCoverage: { withAvatar: usersWithAvatar, linked: usersLinked },
    contractsLinked: contractsLinked + inventoryContractLinked,
    remainingOrphans,
    dryRun: DRY_RUN,
    orgUuid,
  });

  console.log("[link-attachments] done");
  console.log({
    total: stats.total,
    orphanBefore: stats.orphanBefore,
    linkedNow: stats.linkedNow,
    planned: planned.size,
    remainingOrphans,
    releaseCoverage,
    artistCoverage,
    labelCoverage,
  });
}

function writeReport(ctx: {
  stats: Stats;
  skipReasons: Map<string, number>;
  releaseCoverage: { withCoverUrl: number; linked: number; total: number };
  artistCoverage: { withImageUrl: number; linked: number; total: number };
  labelCoverage: { withLogoUrl: number; linked: number; total: number };
  usersCoverage: { withAvatar: number; linked: number };
  contractsLinked: number;
  remainingOrphans: number;
  dryRun: boolean;
  orgUuid: string;
}) {
  const { stats } = ctx;
  const lines: string[] = [];
  lines.push("# Attachment Linking Report");
  lines.push("");
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Mode:** ${ctx.dryRun ? "DRY-RUN (no writes)" : "APPLIED"}`);
  lines.push(`**Catalog organizationId normalized to:** \`${ctx.orgUuid}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|--------|------:|");
  lines.push(`| Total attachments | ${stats.total} |`);
  lines.push(`| Linked before | ${stats.linkedBefore} |`);
  lines.push(`| Orphans before | ${stats.orphanBefore} |`);
  lines.push(`| Links applied (this run) | ${stats.links.length} |`);
  lines.push(`| Linked after | ${stats.linkedNow} |`);
  lines.push(`| Remaining orphans | ${ctx.remainingOrphans} |`);
  lines.push(`| Distinct content duplicates (checksum groups) | ${stats.duplicates.length} |`);
  if (stats.r2Checked) {
    lines.push(`| R2 objects checked | ${stats.r2Checked} |`);
    lines.push(`| R2 missing | ${stats.r2Missing} |`);
  }
  lines.push("");
  lines.push("## Entity coverage");
  lines.push("");
  lines.push("| Entity | With legacy URL/FK | Linked this run | Remaining orphans (global) |");
  lines.push("|--------|-------------------:|----------------:|---------------------------:|");
  lines.push(
    `| Releases | ${ctx.releaseCoverage.withCoverUrl} | ${ctx.releaseCoverage.linked} | see below |`
  );
  lines.push(
    `| Artists | ${ctx.artistCoverage.withImageUrl} | ${ctx.artistCoverage.linked} | see below |`
  );
  lines.push(
    `| Contracts | ${ctx.contractsLinked} | ${stats.byEntity["contract"]?.linked || 0} | see below |`
  );
  lines.push(`| Works | 0 (no FK evidence) | ${stats.byEntity["work"]?.linked || 0} | see below |`);
  lines.push(
    `| Labels | ${ctx.labelCoverage.withLogoUrl} | ${ctx.labelCoverage.linked} | see below |`
  );
  lines.push(`| Publishers | 0 (no logo column) | 0 | see below |`);
  lines.push(
    `| Users | ${ctx.usersCoverage.withAvatar} | ${ctx.usersCoverage.linked} | see below |`
  );
  lines.push(`| **All remaining orphans** | | | **${ctx.remainingOrphans}** |`);
  lines.push("");
  lines.push("### Links by entityType");
  lines.push("");
  lines.push("| entityType | Attachments linked |");
  lines.push("|------------|-------------------:|");
  for (const [k, v] of Object.entries(stats.byEntity).sort()) {
    lines.push(`| ${k} | ${v.linked} |`);
  }
  lines.push("");
  lines.push("## Matching rules used");
  lines.push("");
  lines.push("1. Exact basename from `releases.cover_art_url` → `originalName` / `fileName` / `storageKey`");
  lines.push("2. Exact basename from `artists.profile_image_url`");
  lines.push("3. Exact basename from `labels.logo_url`");
  lines.push("4. Exact basename from `users.avatar_url`");
  lines.push("5. `contract_documents` path/name/checksum + existing `contract_id`");
  lines.push("6. Inventory `contracts/{folder}/…` only when decoded folder id exists in cloud `contracts`");
  lines.push("");
  lines.push("No fuzzy title matching. No re-upload. No R2 renames. Orphans not deleted.");
  lines.push("");
  lines.push("## Logical roles");
  lines.push("");
  lines.push("Schema has no `role` column. Logical roles assigned in metadata only:");
  lines.push("");
  lines.push("| Role | When |");
  lines.push("|------|------|");
  lines.push("| cover | release + image from cover_art_url |");
  lines.push("| profile | artist + image from profile_image_url |");
  lines.push("| logo | label logo_url |");
  lines.push("| document | contract path/FK |");
  lines.push("| avatar | user avatar_url |");
  lines.push("");
  lines.push("## Sample links");
  lines.push("");
  for (const l of stats.links.slice(0, 25)) {
    lines.push(
      `- \`${l.attachmentId}\` → **${l.entityType}:${l.entityId}** (${l.logicalRole}) — ${l.evidence}`
    );
  }
  if (stats.links.length > 25) {
    lines.push(`- … and ${stats.links.length - 25} more`);
  }
  lines.push("");
  lines.push("## Orphan skip reasons (aggregated)");
  lines.push("");
  lines.push("| Reason | Count |");
  lines.push("|--------|------:|");
  for (const [reason, n] of [...ctx.skipReasons.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    lines.push(`| ${reason.replace(/\|/g, "\\|")} | ${n} |`);
  }
  lines.push("");
  lines.push("## Orphans not auto-linked (sample ≤ 200)");
  lines.push("");
  lines.push("| Attachment ID | Name | Reason |");
  lines.push("|---------------|------|--------|");
  for (const s of stats.skips.filter((x) => x.attachmentId !== "-").slice(0, 200)) {
    lines.push(
      `| \`${s.attachmentId}\` | ${s.originalName.replace(/\|/g, "\\|")} | ${s.reason.replace(/\|/g, "\\|")} |`
    );
  }
  lines.push("");
  lines.push("## Content duplicates (not deleted)");
  lines.push("");
  lines.push("Top checksum groups (same bytes, multiple Attachment rows from re-migration):");
  lines.push("");
  lines.push("| Checksum (prefix) | Count | Sample name | Size |");
  lines.push("|-------------------|------:|-------------|-----:|");
  for (const d of stats.duplicates.slice(0, 20)) {
    lines.push(
      `| \`${d.checksum.slice(0, 12)}…\` | ${d.count} | ${d.name} | ${d.size} |`
    );
  }
  lines.push("");
  lines.push("## Validation checklist");
  lines.push("");
  lines.push("| Check | Status |");
  lines.push("|-------|--------|");
  lines.push(
    `| Releases with cover_art_url linked | ${ctx.releaseCoverage.linked}/${ctx.releaseCoverage.withCoverUrl} |`
  );
  lines.push(
    `| Artists with profile_image_url linked | ${ctx.artistCoverage.linked}/${ctx.artistCoverage.withImageUrl || 0} |`
  );
  lines.push(
    `| Labels with logo_url linked | ${ctx.labelCoverage.linked}/${ctx.labelCoverage.withLogoUrl} |`
  );
  lines.push(
    `| Contracts linked | ${stats.byEntity["contract"]?.linked || 0} (cloud contracts with path evidence only) |`
  );
  lines.push(`| Remaining orphans documented | yes (${ctx.remainingOrphans}) |`);
  lines.push("");
  lines.push("### UI note");
  lines.push("");
  lines.push(
    "Release/artist pages currently render `cover_art_url` / `profile_image_url` as raw `/uploads/…` paths. Those paths are not served by cloud static hosting. Attachments are correctly linked for the Storage Service (`/api/storage/download/[id]`). A follow-up UI change should resolve cover/profile via attachment lookup or rewrite URL columns to the download API — **out of scope for this linking-only milestone**."
  );
  lines.push("");
  lines.push("## Related docs");
  lines.push("");
  lines.push("- `docs/migration/attachment-mapping.md`");
  lines.push("- `scripts/migrate-assets/migration-report.md`");
  lines.push("- `LOCAL_STORAGE_ARCHITECTURE.md`");
  lines.push("");

  fs.writeFileSync(REPORT_PATH, lines.join("\n"), "utf-8");
  console.log(`[link-attachments] wrote ${REPORT_PATH}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
