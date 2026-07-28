import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
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

    return NextResponse.json(run);
  } catch (err: any) {
    console.error("[GET /api/reports/[runId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
