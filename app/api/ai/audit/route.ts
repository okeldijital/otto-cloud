import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAllAudits, postFindingsToStatusQuo, type AuditFinding } from "@/lib/ai-audit";
import {
  requireActorUserId,
  requireOrgAuth,
  requirePositiveIntId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const scope = searchParams.get("scope") || "all";
    const ctx = await requireOrgAuth();
    const audits = await runAllAudits(ctx);

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
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/ai/audit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrgAuth();

    if (action === "run") {
      const body = await req.json();
      const scope = body.scope || "all";
      const postToStatusQuo = body.post_to_status_quo !== false;

      const audits = await runAllAudits(ctx);
      const report = scope === "all" ? audits : audits.filter((a) => a.type === scope);
      const allFindings: AuditFinding[] = report.flatMap((a) => a.findings);

      let posted = 0;
      if (postToStatusQuo) {
        posted = await postFindingsToStatusQuo(ctx, allFindings);
      }

      return NextResponse.json({ audits: report, posted_to_status_quo: posted });
    }

    if (action === "resolve") {
      const body = await req.json();
      const { issue_type, entity_type, entity_id } = body;
      // Actor identity is server-derived; never falls back to user id 1.
      const userId = requireActorUserId(ctx);
      // Entity IDs are validated — malformed values fail closed.
      const safeEntityId = requirePositiveIntId(entity_id, "entity_id");

      const existing = await prisma.status_quo_items.findFirst({
        where: {
          organization_id: ctx.organizationId,
          entity_type,
          entity_id: safeEntityId,
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
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[POST /api/ai/audit]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}