import { prisma } from "@/lib/prisma";

function orgFilter(orgId: string | number) {
  return { organization_id: Number(orgId) || orgId } as any;
}

function royaltyOrgFilter(orgId: string | number) {
  const org = String(orgId);
  return {
    OR: [
      { tenant_id: org },
      { artists: { is: { organization_id: org } } },
      { works: { is: { organization_id: org, is_deleted: false } } },
      { tracks: { is: { OR: [
        { tenant_id: org },
        { releases: { is: { organization_id: org, is_deleted: false } } },
        { works: { is: { organization_id: org, is_deleted: false } } },
        { track_releases: { some: { releases: { organization_id: org, is_deleted: false } } } },
      ] } },
    ],
  } as any;
}

function trackOrgFilter(orgId: string | number) {
  const org = String(orgId);
  return { OR: [
    { tenant_id: org },
    { releases: { is: { organization_id: org, is_deleted: false } } },
    { works: { is: { organization_id: org, is_deleted: false } } },
    { track_releases: { some: { releases: { organization_id: org, is_deleted: false } } } },
  ] } as any;
}

export interface ReportDefinition {
  type: string;
  name: string;
  description: string;
  defaultParams: Record<string, any>;
  run: (orgId: string | number, params: Record<string, any>) => Promise<ReportResult>;
}

export interface ReportResult {
  rows: Record<string, any>[];
  summary: Record<string, any>;
  columns: { key: string; label: string }[];
}

const definitions: ReportDefinition[] = [
  {
    type: "catalog_summary",
    name: "Catalog Summary",
    description: "Overview of all catalog entities",
    defaultParams: {},
    async run(orgId) {
      const [artists, releases, tracks, works, labels, publishers, pros] = await Promise.all([
        prisma.artists.count({ where: { ...orgFilter(orgId), is_deleted: false } }),
        prisma.releases.count({ where: { ...orgFilter(orgId), is_deleted: false } }),
        prisma.tracks.count({ where: trackOrgFilter(orgId) }),
        prisma.works.count({ where: { ...orgFilter(orgId), is_deleted: false } }),
        prisma.labels.count(),
        prisma.publishers.count(),
        prisma.pros.count(),
      ]);
      return { columns: [{ key: "entity", label: "Entity" }, { key: "count", label: "Count" }], rows: [
        { entity: "Artists", count: artists }, { entity: "Releases", count: releases }, { entity: "Tracks", count: tracks },
        { entity: "Works", count: works }, { entity: "Labels", count: labels }, { entity: "Publishers", count: publishers }, { entity: "PROs", count: pros },
      ], summary: { total_entities: artists + releases + tracks + works + labels + publishers + pros } };
    },
  },
  {
    type: "contracts_audit", name: "Contracts Audit", description: "Contract completeness, status and health overview", defaultParams: {},
    async run(orgId) {
      const contracts = await prisma.contracts.findMany({ where: { ...orgFilter(orgId) }, include: { _count: { select: { contract_parties: true, contract_documents: true, contract_assets: true } } } });
      const rows = contracts.map((c) => ({ id: c.id, title: c.title || "Untitled", contract_number: c.contract_number || "", status: c.status || "Draft", type: c.type || "", parties: c._count.contract_parties, documents: c._count.contract_documents, assets: c._count.contract_assets, has_parties: c._count.contract_parties > 0, has_documents: c._count.contract_documents > 0, has_assets: c._count.contract_assets > 0, complete: c._count.contract_parties > 0 && c._count.contract_documents > 0, start_date: c.start_date?.toISOString().split("T")[0] || "", end_date: c.end_date?.toISOString().split("T")[0] || "" }));
      const statusDist: Record<string, number> = {};
      for (const r of rows) statusDist[r.status] = (statusDist[r.status] || 0) + 1;
      return { columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "contract_number", label: "Contract #" }, { key: "status", label: "Status" }, { key: "type", label: "Type" }, { key: "parties", label: "Parties" }, { key: "documents", label: "Documents" }, { key: "assets", label: "Assets" }, { key: "complete", label: "Complete" }], rows, summary: { total: rows.length, status_distribution: statusDist, complete: rows.filter((r) => r.complete).length, incomplete: rows.filter((r) => !r.complete).length, missing_documents: rows.filter((r) => !r.has_documents).length, missing_parties: rows.filter((r) => !r.has_parties).length } };
    },
  },
  {
    type: "royalties_summary", name: "Royalties Summary", description: "Royalty totals by source, artist, and period", defaultParams: {},
    async run(orgId) {
      const royalties = await prisma.royalties.findMany({ where: royaltyOrgFilter(orgId) });
      const total = royalties.reduce((s, r) => s + (r.amount?.toNumber() || 0), 0);
      const bySource: Record<string, number> = {};
      for (const r of royalties) { const src = r.source || "Unknown"; bySource[src] = (bySource[src] || 0) + (r.amount?.toNumber() || 0); }
      const rows = royalties.map((r) => ({ id: r.id, source: r.source || "Unknown", amount: r.amount?.toNumber() || 0, currency: r.currency || "USD", artist_id: r.artist_id, work_id: r.work_id, track_id: r.track_id, statement_date: r.statement_date?.toISOString().split("T")[0] || "" }));
      return { columns: [{ key: "id", label: "ID" }, { key: "source", label: "Source" }, { key: "amount", label: "Amount" }, { key: "currency", label: "Currency" }, { key: "artist_id", label: "Artist ID" }, { key: "statement_date", label: "Statement Date" }], rows, summary: { total_royalties: royalties.length, total_amount: total, by_source: bySource } };
    },
  },
  {
    type: "tasks_progress", name: "Task Progress", description: "Task status and completion overview", defaultParams: {},
    async run(orgId) {
      const tasks = await prisma.tasks.findMany({ where: { ...orgFilter(orgId) } });
      const statusDist: Record<string, number> = {};
      for (const t of tasks) { const s = t.status || "unknown"; statusDist[s] = (statusDist[s] || 0) + 1; }
      return { columns: [{ key: "id", label: "ID" }, { key: "title", label: "Title" }, { key: "status", label: "Status" }, { key: "priority", label: "Priority" }, { key: "due_date", label: "Due Date" }], rows: tasks.map((t) => ({ id: t.id, title: t.title || "", status: t.status || "open", priority: t.priority || "medium", due_date: t.due_date?.toISOString().split("T")[0] || "" })), summary: { total: tasks.length, status_distribution: statusDist, done: statusDist["done"] || 0, pending: tasks.length - (statusDist["done"] || 0) } };
    },
  },
  {
    type: "status_quo", name: "Status Quo Analysis", description: "Active issues by severity and entity", defaultParams: {},
    async run(orgId) {
      const items = await prisma.status_quo_items.findMany({ where: { ...orgFilter(orgId) } });
      const severityDist: Record<string, number> = {}; const typeDist: Record<string, number> = {};
      for (const item of items) { const sev = item.severity || "UNKNOWN"; severityDist[sev] = (severityDist[sev] || 0) + 1; const t = item.issue_type || "other"; typeDist[t] = (typeDist[t] || 0) + 1; }
      return { columns: [{ key: "id", label: "ID" }, { key: "issue_type", label: "Issue Type" }, { key: "severity", label: "Severity" }, { key: "entity_type", label: "Entity Type" }, { key: "entity_id", label: "Entity ID" }, { key: "resolved", label: "Resolved" }], rows: items.map((item) => ({ id: item.id, issue_type: item.issue_type || "", severity: item.severity || "UNKNOWN", entity_type: item.entity_type || "", entity_id: item.entity_id, resolved: item.resolved_at ? "Yes" : "No", message: item.summary || "" })), summary: { total: items.length, active: items.filter((i) => !i.resolved_at).length, resolved: items.filter((i) => i.resolved_at).length, by_severity: severityDist, by_type: typeDist } };
    },
  },
  {
    type: "activity_log", name: "Activity Log", description: "Recent organization activity", defaultParams: { limit: 50 },
    async run(orgId, params) {
      const limit = params.limit || 50;
      const activities = await prisma.activities.findMany({ where: { users: { organization_id: String(orgId) } }, orderBy: { timestamp: "desc" as const }, take: limit });
      return { columns: [{ key: "id", label: "ID" }, { key: "action", label: "Action" }, { key: "entity_type", label: "Entity Type" }, { key: "entity_id", label: "Entity ID" }, { key: "created_at", label: "Timestamp" }], rows: activities.map((a) => ({ id: a.id, action: a.action || "", entity_type: a.entity_type || "", entity_id: a.entity_id || "", created_at: a.timestamp?.toISOString?.() || "" })), summary: { total: activities.length } };
    },
  },
];

export function getReportDefinitions(): Pick<ReportDefinition, "type" | "name" | "description" | "defaultParams">[] { return definitions.map((d) => ({ type: d.type, name: d.name, description: d.description, defaultParams: d.defaultParams })); }
export function getReportDefinition(type: string): ReportDefinition | undefined { return definitions.find((d) => d.type === type); }

export async function runReport(orgId: string | number, userId: number, reportType: string, params: Record<string, any> = {}): Promise<{ runId: number; result: ReportResult }> {
  const def = getReportDefinition(reportType);
  if (!def) throw new Error(`Unknown report type: ${reportType}`);
  const run = await prisma.report_runs.create({ data: { organization_id: String(orgId), status: "running", requested_by_user_id: userId, parameters_json: JSON.stringify({ report_type: reportType, ...params }) } });
  try {
    const result = await def.run(String(orgId), { ...def.defaultParams, ...params });
    await prisma.report_runs.update({ where: { id: run.id }, data: { status: "done", row_count: result.rows.length, updated_at: new Date() } });
    return { runId: run.id, result };
  } catch (err: any) {
    await prisma.report_runs.update({ where: { id: run.id }, data: { status: "failed", error: err.message, updated_at: new Date() } });
    throw err;
  }
}
