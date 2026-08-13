import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getReportDefinition } from "@/lib/reports";
import { requireOrganization } from "@/lib/auth/organization-context";
import { requirePositiveIntId } from "@/lib/auth/resource-authorization";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId: runIdStr } = await params;
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const runId = requirePositiveIntId(runIdStr, "report run ID");
    const run = await prisma.report_runs.findFirst({ where: { id: runId, organization_id: ctx.organizationId } });
    if (!run) return NextResponse.json({ error: "Report run not found", code: "NOT_FOUND" }, { status: 404 });
    if (run.status !== "done") return NextResponse.json({ error: "Report is not yet complete", status: run.status }, { status: 400 });
    let params_json: any = {};
    try { params_json = JSON.parse(run.parameters_json || "{}"); } catch { return NextResponse.json({ error: "Invalid report parameters", code: "VALIDATION_ERROR" }, { status: 400 }); }
    const reportType = params_json.report_type || "catalog_summary";
    const def = getReportDefinition(reportType);
    if (!def) return NextResponse.json({ error: "Report definition not found", code: "NOT_FOUND" }, { status: 404 });
    const result = await def.run(String(ctx.organizationId), params_json);
    return NextResponse.json({ run_id: runId, report_type: reportType, rows: result.rows, summary: result.summary, columns: result.columns, generated_at: run.created_at });
  } catch (err: any) {
    if (err?.status === 400 || err?.status === 401 || err?.status === 403 || err?.status === 404) return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    console.error("[GET /api/reports/[runId]/data]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
