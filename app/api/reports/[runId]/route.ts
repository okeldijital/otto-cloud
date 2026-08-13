import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    return NextResponse.json(run);
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/reports/[runId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}