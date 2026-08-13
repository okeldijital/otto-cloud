import { prisma } from "@/lib/prisma";
import {
  activityOrgScopeWhere,
  requireActorUserId,
  royaltyOrgScopeWhere,
} from "@/lib/auth/resource-authorization";
import type { OrganizationContext } from "@/lib/auth/organization-context";

function orgFilter(orgId: string | number) {
  return { organization_id: Number(orgId) || orgId } as any;
}

export interface ReportDefinition {
  type: string;
  name: string;
  description: string;
  defaultParams: Record<string, any>;
  run: (ctx: OrganizationContext, params: Record<string, any>) => Promise<ReportResult>;
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
    async run(ctx) {
      const [artists, releases, tracks, works, labels, publishers, pros] = await Promise.all([
        prisma.artists.count({ where: { ...orgFilter(ctx.organizationId), is_deleted: false } }),
        prisma.releases.count({ where: { ...orgFilter(ctx.organizationId), is_deleted: false } }),
        prisma.tracks.count(),
        prisma.works.count({ where: { ...orgFilter(ctx.organizationId), is_deleted: false } }),
        prisma.labels.count(),
        prisma.publishers.count(),
        prisma.pros.count(),
      ]);
      return {
        columns: [
          { key: "entity", label: "Entity" },
          { key: "count", label: "Count" },
        ],
        rows: [
          { entity: "Artists", count: artists },
          { entity: "Releases", count: releases },
          { entity: "Tracks", count: tracks },
          { entity: "Works", count: works },
          { entity: "Labels", count: labels },
          { entity: "Publishers", count: publishers },
          { entity: "PROs", count: pros },
        ],
        summary: { total_entities: artists + releases + tracks + works + labels + publishers + pros },
      };
    },
  },
  {
    type: "contracts_audit",
    name: "Contracts Audit",
    description: "Contract completeness, status and health overview",
    defaultParams: {},
    async run(ctx) {
      const contracts = await prisma.contracts.findMany({
        where: { ...orgFilter(ctx.organizationId) },
        include: {
          _count: { select: { contract_parties: true, contract_documents: true, contract_assets: true } },
        },
      });
      const rows = contracts.map((c) => ({
        id: c.id,
        title: c.title || "Untitled",
        contract_number: c.contract_number || "",
        status: c.status || "Draft",
        type: c.type || "",
        parties: c._count.contract_parties,
        documents: c._count.contract_documents,
        assets: c._count.contract_assets,
        has_parties: c._count.contract_parties > 0,
        has_documents: c._count.contract_documents > 0,
        has_assets: c._count.contract_assets > 0,
        complete: c._count.contract_parties > 0 && c._count.contract_documents > 0,
        start_date: c.start_date?.toISOString().split("T")[0] || "",
        end_date: c.end_date?.toISOString().split("T")[0] || "",
      }));
      const statusDist: Record<string, number> = {};
      for (const r of rows) {
        const s = r.status;
        statusDist[s] = (statusDist[s] || 0) + 1;
      }
      return {
        columns: [
          { key: "id", label: "ID" },
          { key: "title", label: "Title" },
          { key: "contract_number", label: "Contract #" },
          { key: "status", label: "Status" },
          { key: "type", label: "Type" },
          { key: "parties", label: "Parties" },
          { key: "documents", label: "Documents" },
          { key: "assets", label: "Assets" },
          { key: "complete", label: "Complete" },
        ],
        rows,
        summary: {
          total: rows.length,
          status_distribution: statusDist,
          complete: rows.filter((r) => r.complete).length,
          incomplete: rows.filter((r) => !r.complete).length,
          missing_documents: rows.filter((r) => !r.has_documents).length,
          missing_parties: rows.filter((r) => !r.has_parties).length,
        },
      };
    },
  },
  {
    type: "royalties_summary",
    name: "Royalties Summary",
    description: "Royalty totals by source, artist, and period",
    defaultParams: {},
    async run(ctx) {
      // Organization-scoped via royaltyOrgScopeWhere (tenant_id or linked
      // artist/work/track ownership). Never a global royalties query.
      const where = royaltyOrgScopeWhere(ctx);
      const royalties = await prisma.royalties.findMany({ where });
      const total = royalties.reduce((s, r) => s + (r.amount?.toNumber() || 0), 0);
      const bySource: Record<string, number> = {};
      const byArtist: Record<string, { count: number; total: number }> = {};
      for (const r of royalties) {
        const src = r.source || "Unknown";
        bySource[src] = (bySource[src] || 0) + (r.amount?.toNumber() || 0);
        const key = r.artist_id ? `artist_${r.artist_id}` : "unattributed";
        if (!byArtist[key]) byArtist[key] = { count: 0, total: 0 };
        byArtist[key].count++;
        byArtist[key].total += r.amount?.toNumber() || 0;
      }
      const rows = royalties.map((r) => ({
        id: r.id,
        source: r.source || "Unknown",
        amount: r.amount?.toNumber() || 0,
        currency: r.currency || "USD",
        artist_id: r.artist_id,
        work_id: r.work_id,
        track_id: r.track_id,
        statement_date: r.statement_date?.toISOString().split("T")[0] || "",
      }));
      return {
        columns: [
          { key: "id", label: "ID" },
          { key: "source", label: "Source" },
          { key: "amount", label: "Amount" },
          { key: "currency", label: "Currency" },
          { key: "artist_id", label: "Artist ID" },
          { key: "statement_date", label: "Statement Date" },
        ],
        rows,
        summary: { total_royalties: royalties.length, total_amount: total, by_source: bySource },
      };
    },
  },
  {
    type: "tasks_progress",
    name: "Task Progress",
    description: "Task status and completion overview",
    defaultParams: {},
    async run(ctx) {
      const tasks = await prisma.tasks.findMany({ where: { ...orgFilter(ctx.organizationId) } });
      const statusDist: Record<string, number> = {};
      for (const t of tasks) {
        const s = t.status || "unknown";
        statusDist[s] = (statusDist[s] || 0) + 1;
      }
      return {
        columns: [
          { key: "id", label: "ID" },
          { key: "title", label: "Title" },
          { key: "status", label: "Status" },
          { key: "priority", label: "Priority" },
          { key: "due_date", label: "Due Date" },
        ],
        rows: tasks.map((t) => ({
          id: t.id,
          title: t.title || "",
          status: t.status || "open",
          priority: t.priority || "medium",
          due_date: t.due_date?.toISOString().split("T")[0] || "",
        })),
        summary: {
          total: tasks.length,
          status_distribution: statusDist,
          done: statusDist["done"] || 0,
          pending: tasks.length - (statusDist["done"] || 0),
        },
      };
    },
  },
  {
    type: "status_quo",
    name: "Status Quo Analysis",
    description: "Active issues by severity and entity",
    defaultParams: {},
    async run(ctx) {
      const items = await prisma.status_quo_items.findMany({ where: { ...orgFilter(ctx.organizationId) } });
      const severityDist: Record<string, number> = {};
      const typeDist: Record<string, number> = {};
      for (const item of items) {
        const sev = item.severity || "UNKNOWN";
        severityDist[sev] = (severityDist[sev] || 0) + 1;
        const t = item.issue_type || "other";
        typeDist[t] = (typeDist[t] || 0) + 1;
      }
      return {
        columns: [
          { key: "id", label: "ID" },
          { key: "issue_type", label: "Issue Type" },
          { key: "severity", label: "Severity" },
          { key: "entity_type", label: "Entity Type" },
          { key: "entity_id", label: "Entity ID" },
          { key: "resolved", label: "Resolved" },
        ],
        rows: items.map((item) => ({
          id: item.id,
          issue_type: item.issue_type || "",
          severity: item.severity || "UNKNOWN",
          entity_type: item.entity_type || "",
          entity_id: item.entity_id,
          resolved: item.resolved_at ? "Yes" : "No",
          message: item.summary || "",
        })),
        summary: {
          total: items.length,
          active: items.filter((i) => !i.resolved_at).length,
          resolved: items.filter((i) => i.resolved_at).length,
          by_severity: severityDist,
          by_type: typeDist,
        },
      };
    },
  },
  {
    type: "activity_log",
    name: "Activity Log",
    description: "Recent organization activity",
    defaultParams: { limit: 50 },
    async run(ctx, params) {
      const limit = params.limit || 50;
      // Organization-scoped via activities.user_id → users.organization_id.
      // Never a global activities feed.
      const activities = await prisma.activities.findMany({
        where: activityOrgScopeWhere(ctx),
        orderBy: { timestamp: "desc" as const },
        take: limit,
      });
      return {
        columns: [
          { key: "id", label: "ID" },
          { key: "action", label: "Action" },
          { key: "entity_type", label: "Entity Type" },
          { key: "entity_id", label: "Entity ID" },
          { key: "created_at", label: "Timestamp" },
        ],
        rows: activities.map((a) => ({
          id: a.id,
          action: a.action || "",
          entity_type: a.entity_type || "",
          entity_id: a.entity_id || "",
          created_at: a.timestamp?.toISOString?.() || "",
        })),
        summary: { total: activities.length },
      };
    },
  },
];

export function getReportDefinitions(): Pick<ReportDefinition, "type" | "name" | "description" | "defaultParams">[] {
  return definitions.map((d) => ({
    type: d.type,
    name: d.name,
    description: d.description,
    defaultParams: d.defaultParams,
  }));
}

export function getReportDefinition(type: string): ReportDefinition | undefined {
  return definitions.find((d) => d.type === type);
}

export async function runReport(
  ctx: OrganizationContext,
  reportType: string,
  params: Record<string, any> = {}
): Promise<{ runId: number; result: ReportResult }> {
  const def = getReportDefinition(reportType);
  if (!def) throw new Error(`Unknown report type: ${reportType}`);

  // Actor identity is server-derived; never falls back to a default user id.
  const userId = requireActorUserId(ctx);
  const orgId = ctx.organizationId;

  const run = await prisma.report_runs.create({
    data: {
      organization_id: orgId,
      status: "running",
      requested_by_user_id: userId,
      parameters_json: JSON.stringify({ report_type: reportType, ...params }),
    },
  });

  try {
    const result = await def.run(ctx, { ...def.defaultParams, ...params });

    await prisma.report_runs.update({
      where: { id: run.id },
      data: {
        status: "done",
        row_count: result.rows.length,
        updated_at: new Date(),
      },
    });

    return { runId: run.id, result };
  } catch (err: any) {
    await prisma.report_runs.update({
      where: { id: run.id },
      data: { status: "failed", error: err.message, updated_at: new Date() },
    });
    throw err;
  }
}
