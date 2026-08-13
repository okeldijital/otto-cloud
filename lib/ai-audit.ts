import { prisma } from "@/lib/prisma";

export interface AuditFinding { issue_type: string; severity: "RED" | "AMBER" | "GREEN"; entity_type: string; entity_id: number; summary: string; details?: string; }
export interface AuditReport { type: string; label: string; findings: AuditFinding[]; summary: { total: number; red: number; amber: number; green: number }; }
function orgFilter(orgId: string | number) { return { organization_id: Number(orgId) || orgId } as any; }
function trackOrgFilter(orgId: string | number) { const org = String(orgId); return { OR: [{ tenant_id: org }, { releases: { is: { organization_id: org, is_deleted: false } } }, { works: { is: { organization_id: org, is_deleted: false } } }, { track_releases: { some: { releases: { organization_id: org, is_deleted: false } } } }] } as any; }
function royaltyOrgFilter(orgId: string | number) { const org = String(orgId); return { OR: [{ tenant_id: org }, { artists: { is: { organization_id: org } } }, { works: { is: { organization_id: org, is_deleted: false } } }, { tracks: { is: trackOrgFilter(orgId) } }] } as any; }

export async function checkCatalogConsistency(orgId: string | number): Promise<AuditReport> {
  const findings: AuditFinding[] = [];
  const orphans = await prisma.tracks.findMany({ where: { AND: [trackOrgFilter(orgId), { release_id: null }] }, take: 50 });
  for (const t of orphans) findings.push({ issue_type: "orphan_track", severity: "AMBER", entity_type: "track", entity_id: t.id, summary: `Track "${t.title || `#${t.id}`}" has no linked release`, details: "Tracks should be associated with at least one release." });
  const tracksWithoutWork = await prisma.tracks.findMany({ where: { AND: [trackOrgFilter(orgId), { work_id: null }] }, take: 50 });
  for (const t of tracksWithoutWork) findings.push({ issue_type: "track_no_work", severity: "AMBER", entity_type: "track", entity_id: t.id, summary: `Track "${t.title || `#${t.id}`}" has no linked work` });
  const releasesWithoutTracks = await prisma.releases.findMany({ where: { ...orgFilter(orgId), is_deleted: false }, include: { _count: { select: { track_releases: true } } }, take: 50 });
  for (const r of releasesWithoutTracks.filter((r) => r._count.track_releases === 0)) findings.push({ issue_type: "empty_release", severity: "RED", entity_type: "release", entity_id: r.id, summary: `Release "${r.title || `#${r.id}`}" has no tracks`, details: "Releases should contain at least one track." });
  const worksWithoutTracks = await prisma.works.findMany({ where: { ...orgFilter(orgId), is_deleted: false }, take: 50 });
  const linkedWorkIds = new Set((await prisma.tracks.findMany({ where: { AND: [trackOrgFilter(orgId), { work_id: { not: null } }] }, select: { work_id: true } })).map((t) => t.work_id).filter(Boolean) as number[]);
  for (const w of worksWithoutTracks) if (!linkedWorkIds.has(w.id)) findings.push({ issue_type: "orphan_work", severity: "AMBER", entity_type: "work", entity_id: w.id, summary: `Work "${w.title || `#${w.id}`}" has no linked tracks` });
  return { type: "catalog_consistency", label: "Catalog Consistency", findings, summary: { total: findings.length, red: findings.filter((f) => f.severity === "RED").length, amber: findings.filter((f) => f.severity === "AMBER").length, green: findings.filter((f) => f.severity === "GREEN").length } };
}

export async function checkReleaseQuality(orgId: string | number): Promise<AuditReport> {
  const findings: AuditFinding[] = [];
  const releases = await prisma.releases.findMany({ where: { ...orgFilter(orgId), is_deleted: false }, take: 100 });
  for (const r of releases) {
    const missing: string[] = [];
    if (!r.title) missing.push("title"); if (!r.release_type) missing.push("release_type"); if (!r.release_date) missing.push("release_date"); if (!r.upc_code) missing.push("UPC");
    const artistIds = r.artist_ids as unknown as number[] | null;
    if (!r.artist_id && !artistIds?.length) missing.push("artist"); if (!r.label_id) missing.push("label");
    if (missing.length > 0) findings.push({ issue_type: "incomplete_release", severity: missing.length > 2 ? "RED" : "AMBER", entity_type: "release", entity_id: r.id, summary: `Release "${r.title || `#${r.id}`}" missing: ${missing.join(", ")}` });
  }
  for (const r of releases.filter((r) => !r.cover_art_url)) findings.push({ issue_type: "missing_artwork", severity: "GREEN", entity_type: "release", entity_id: r.id, summary: `Release "${r.title || `#${r.id}`}" has no artwork` });
  return { type: "release_quality", label: "Release Quality", findings, summary: { total: findings.length, red: findings.filter((f) => f.severity === "RED").length, amber: findings.filter((f) => f.severity === "AMBER").length, green: findings.filter((f) => f.severity === "GREEN").length } };
}

export async function checkRoyaltyAnomalies(orgId: string | number): Promise<AuditReport> {
  const findings: AuditFinding[] = [];
  const royalties = await prisma.royalties.findMany({ where: royaltyOrgFilter(orgId), take: 500 });
  if (royalties.length > 0) {
    const amounts = royalties.map((r) => r.amount?.toNumber() || 0);
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / amounts.length);
    const threshold = mean + 3 * stdDev;
    for (const r of royalties) {
      const amt = r.amount?.toNumber() || 0;
      if (amt > threshold && amt > 1000) findings.push({ issue_type: "royalty_anomaly", severity: "AMBER", entity_type: "royalty", entity_id: r.id, summary: `Royalty #${r.id} (${r.source || "unknown"}): $${amt.toFixed(2)} is ${(amt / mean).toFixed(1)}x the mean`, details: `Amount $${amt.toFixed(2)} exceeds threshold of $${threshold.toFixed(2)} (mean: $${mean.toFixed(2)}, SD: $${stdDev.toFixed(2)})` });
    }
    for (const r of royalties.filter((r) => (r.amount?.toNumber() || 0) < 0)) findings.push({ issue_type: "negative_royalty", severity: "RED", entity_type: "royalty", entity_id: r.id, summary: `Royalty #${r.id} (${r.source || "unknown"}) has negative amount: $${(r.amount?.toNumber() || 0).toFixed(2)}` });
  }
  return { type: "royalty_anomalies", label: "Royalty Anomalies", findings, summary: { total: findings.length, red: findings.filter((f) => f.severity === "RED").length, amber: findings.filter((f) => f.severity === "AMBER").length, green: findings.filter((f) => f.severity === "GREEN").length } };
}

export async function checkContracts(orgId: string | number): Promise<AuditReport> {
  const findings: AuditFinding[] = [];
  const contracts = await prisma.contracts.findMany({ where: { ...orgFilter(orgId) }, include: { _count: { select: { contract_parties: true, contract_documents: true, contract_assets: true } } }, take: 100 });
  for (const c of contracts) {
    if (!c._count.contract_documents) findings.push({ issue_type: "missing_document", severity: "RED", entity_type: "contract", entity_id: c.id, summary: `Contract "${c.title || `#${c.id}`}" has no signed document` });
    if (!c._count.contract_parties) findings.push({ issue_type: "missing_parties", severity: "RED", entity_type: "contract", entity_id: c.id, summary: `Contract "${c.title || `#${c.id}`}" has no parties` });
    if (!c.start_date || !c.end_date) findings.push({ issue_type: "missing_dates", severity: "AMBER", entity_type: "contract", entity_id: c.id, summary: `Contract "${c.title || `#${c.id}`}" is missing effective dates` });
  }
  return { type: "contracts_audit", label: "Contracts Audit", findings, summary: { total: findings.length, red: findings.filter((f) => f.severity === "RED").length, amber: findings.filter((f) => f.severity === "AMBER").length, green: findings.filter((f) => f.severity === "GREEN").length } };
}

export async function runAllAudits(orgId: string | number): Promise<AuditReport[]> { return Promise.all([checkCatalogConsistency(orgId), checkReleaseQuality(orgId), checkRoyaltyAnomalies(orgId), checkContracts(orgId)]); }
export async function postFindingsToStatusQuo(orgId: string | number, findings: AuditFinding[]): Promise<number> {
  let count = 0;
  for (const f of findings) {
    const existing = await prisma.status_quo_items.findFirst({ where: { ...orgFilter(orgId), entity_type: f.entity_type, entity_id: f.entity_id, issue_type: f.issue_type, resolved_at: null } });
    if (!existing) { await prisma.status_quo_items.create({ data: { organization_id: String(Number(orgId) || orgId), entity_type: f.entity_type, entity_id: f.entity_id, issue_type: f.issue_type, severity: f.severity, summary: f.summary, details_json: f.details ? JSON.stringify({ details: f.details }) : null, created_at: new Date() } }); count++; }
  }
  return count;
}
