import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { runAllAudits, postFindingsToStatusQuo, type AuditFinding } from "@/lib/ai-audit";
import { requireOrganization } from "@/lib/auth/organization-context";
import { requireActorUserId, requirePositiveIntId } from "@/lib/auth/resource-authorization";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const scope = searchParams.get("scope") || "all";
    const ctx = await requireOrganization();
    const audits = await runAllAudits(ctx.organizationId);
    if (action === "summary") {
      const merged = { total: 0, red: 0, amber: 0, green: 0 };
      for (const a of audits) { merged.total += a.summary.total; merged.red += a.summary.red; merged.amber += a.summary.amber; merged.green += a.summary.green; }
      return NextResponse.json({ summary: merged, audits: audits.map((a) => ({ type: a.type, label: a.label, summary: a.summary })) });
    }
    const report = scope === "all" ? audits : audits.filter((a) => a.type === scope);
    return NextResponse.json({ audits: report });
  } catch (err: any) {
    console.error("[GET /api/ai/audit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    if (action === "run") {
      const body = await req.json();
      const scope = body.scope || "all";
      const postToStatusQuo = body.post_to_status_quo !== false;
      const audits = await runAllAudits(ctx.organizationId);
      const report = scope === "all" ? audits : audits.filter((a) => a.type === scope);
      const allFindings: AuditFinding[] = report.flatMap((a) => a.findings);
      const posted = postToStatusQuo ? await postFindingsToStatusQuo(ctx.organizationId, allFindings) : 0;
      return NextResponse.json({ audits: report, posted_to_status_quo: posted });
    }
    if (action === "resolve") {
      const body = await req.json();
      const { issue_type, entity_type, entity_id } = body;
      const entityId = requirePositiveIntId(entity_id, "entity_id");
      const existing = await prisma.status_quo_items.findFirst({ where: { organization_id: ctx.organizationId, entity_type, entity_id: entityId, issue_type, resolved_at: null } });
      if (existing) await prisma.status_quo_items.update({ where: { id: existing.id }, data: { resolved_at: new Date(), resolved_by_user_id: requireActorUserId(ctx) } });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    if (err?.status === 400 || err?.status === 401 || err?.status === 403 || err?.status === 404) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    console.error("[POST /api/ai/audit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
