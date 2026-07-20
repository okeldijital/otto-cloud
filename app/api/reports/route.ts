import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getReportDefinitions, runReport } from "@/lib/reports";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "definitions") {
      return NextResponse.json(getReportDefinitions());
    }

    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = parseInt(searchParams.get("skip") || "0");

    const [runs, total] = await Promise.all([
      prisma.report_runs.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        take: limit,
        skip,
      }),
      prisma.report_runs.count({ where: { organization_id: orgId } }),
    ]);

    return NextResponse.json({ items: runs, total });
  } catch (err: any) {
    console.error("[GET /api/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const userId = parseInt((session.user as any).id) || 1;
    const body = await req.json();
    const { report_type, params } = body;

    if (!report_type) return NextResponse.json({ error: "report_type is required" }, { status: 400 });

    const { runId, result } = await runReport(orgId, userId, report_type, params || {});

    return NextResponse.json({ run_id: runId, ...result });
  } catch (err: any) {
    console.error("[POST /api/reports]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "");
    if (!id) return NextResponse.json({ error: "Missing report run ID" }, { status: 400 });

    await prisma.report_artifacts.deleteMany({ where: { report_run_id: id } });
    await prisma.report_runs.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
