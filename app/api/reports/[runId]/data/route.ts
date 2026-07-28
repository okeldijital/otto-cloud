import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getReportDefinition } from "@/lib/reports";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId: runIdStr } = await params;
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const runId = parseInt(runIdStr);

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

    const result = await def.run(String(orgId), params_json);

    return NextResponse.json({
      run_id: runId,
      report_type: reportType,
      rows: result.rows,
      summary: result.summary,
      columns: result.columns,
      generated_at: run.created_at,
    });
  } catch (err: any) {
    console.error("[GET /api/reports/[runId]/data]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
