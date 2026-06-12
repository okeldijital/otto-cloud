import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runAllAudits, postFindingsToStatusQuo, type AuditFinding } from "@/lib/ai-audit";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const scope = searchParams.get("scope") || "all";
    const orgId = (session.user as any).organization_id;

    const audits = await runAllAudits(orgId);

    if (action === "summary") {
      const merged = { total: 0, red: 0, amber: 0, green: 0 };
      for (const a of audits) {
        merged.total += a.summary.total;
        merged.red += a.summary.red;
        merged.amber += a.summary.amber;
        merged.green += a.summary.green;
      }
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
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const orgId = (session.user as any).organization_id;

    if (action === "run") {
      const body = await req.json();
      const scope = body.scope || "all";
      const postToStatusQuo = body.post_to_status_quo !== false;

      const audits = await runAllAudits(orgId);
      const report = scope === "all" ? audits : audits.filter((a) => a.type === scope);
      const allFindings: AuditFinding[] = report.flatMap((a) => a.findings);

      let posted = 0;
      if (postToStatusQuo) {
        posted = await postFindingsToStatusQuo(orgId, allFindings);
      }

      return NextResponse.json({ audits: report, posted_to_status_quo: posted });
    }

    if (action === "resolve") {
      const body = await req.json();
      const { issue_type, entity_type, entity_id } = body;
      const userId = parseInt((session.user as any).id) || 1;

      const existing = await prisma.status_quo_items.findFirst({
        where: {
          organization_id: orgId,
          entity_type,
          entity_id: parseInt(entity_id),
          issue_type,
          resolved_at: null,
        },
      });

      if (existing) {
        await prisma.status_quo_items.update({
          where: { id: existing.id },
          data: { resolved_at: new Date(), resolved_by_user_id: userId },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/ai/audit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
