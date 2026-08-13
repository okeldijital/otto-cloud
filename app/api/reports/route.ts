import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getReportDefinitions, runReport } from "@/lib/reports";
import {
  requireOrgAuth,
  requirePositiveIntId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrgAuth();

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
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireOrgAuth();

    const body = await req.json();
    const { report_type, params } = body;

    if (!report_type) return NextResponse.json({ error: "report_type is required" }, { status: 400 });

    // Actor identity and org are server-derived inside runReport (no || 1 fallback).
    const { runId, result } = await runReport(ctx, report_type, params || {});

    return NextResponse.json({ run_id: runId, ...result });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[POST /api/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrgAuth();

    const { searchParams } = new URL(req.url);
    const id = requirePositiveIntId(searchParams.get("id") || "", "id");

    // Deletion is organization-bound: the run must belong to the caller's org.
    const run = await prisma.report_runs.findFirst({
      where: { id, organization_id: ctx.organizationId },
      select: { id: true },
    });
    if (!run) return NextResponse.json({ error: "Report run not found" }, { status: 404 });

    await prisma.report_artifacts.deleteMany({ where: { report_run_id: id } });
    await prisma.report_runs.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[DELETE /api/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}