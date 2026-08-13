import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReportDefinition } from "@/lib/reports";
import {
  requireOrgAuth,
  requirePositiveIntId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId: runIdStr } = await params;
  try {
    const ctx = await requireOrgAuth();

    const orgId = ctx.organizationId;
    const runId = requirePositiveIntId(runIdStr, "runId");

    const run = await prisma.report_runs.findFirst({
      where: { id: runId, organization_id: orgId },
    });
    if (!run) return NextResponse.json({ error: "Report run not found" }, { status: 404 });

    if (run.status !== "done") {
      return NextResponse.json({ error: "Report is not yet complete", status: run.status }, { status: 400 });
    }

    let params_json: any = {};
    try { params_json = JSON.parse(run.parameters_json || "{}"); } catch {}
    const reportType = params_json.report_type || "catalog_summary";

    const def = getReportDefinition(reportType);
    if (!def) return NextResponse.json({ error: "Report definition not found" }, { status: 404 });

    // Re-run is organization-bound: def.run receives the authenticated org ctx.
    const result = await def.run(ctx, params_json);

    return NextResponse.json({
      run_id: runId,
      report_type: reportType,
      rows: result.rows,
      summary: result.summary,
      columns: result.columns,
      generated_at: run.created_at,
    });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/reports/[runId]/data]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}