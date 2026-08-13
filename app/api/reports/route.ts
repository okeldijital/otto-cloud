import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getReportDefinitions, runReport } from "@/lib/reports";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import { requireActorUserId, requirePositiveIntId } from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    if (action === "definitions") return NextResponse.json(getReportDefinitions());
    const limit = Math.min(requirePositiveIntId(searchParams.get("limit") || "20", "limit"), 100);
    const skip = searchParams.get("skip") ? requirePositiveIntId(searchParams.get("skip"), "skip") : 0;
    const [runs, total] = await Promise.all([
      prisma.report_runs.findMany({ where: { organization_id: orgId }, orderBy: { created_at: "desc" }, take: limit, skip }),
      prisma.report_runs.count({ where: { organization_id: orgId } }),
    ]);
    return NextResponse.json({ items: runs, total });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 400 || mapped.status === 401 || mapped.status === 403) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const body = await req.json();
    const { report_type, params } = body;
    if (!report_type) return NextResponse.json({ error: "report_type is required" }, { status: 400 });
    const { runId, result } = await runReport(ctx.organizationId, requireActorUserId(ctx), report_type, params || {});
    return NextResponse.json({ run_id: runId, ...result });
  } catch (err: any) {
    console.error("[POST /api/reports]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: err.status || 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const id = requirePositiveIntId(searchParams.get("id"), "report run ID");
    const run = await prisma.report_runs.findFirst({ where: { id, organization_id: ctx.organizationId }, select: { id: true } });
    if (!run) return NextResponse.json({ error: "Report run not found", code: "NOT_FOUND" }, { status: 404 });
    await prisma.report_artifacts.deleteMany({ where: { report_run_id: id } });
    await prisma.report_runs.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/reports]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: err.status || 500 });
  }
}
