import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { calculateReadinessScore } from "@/app/api/release-workspace/route";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const workspaceId = wpId;

    const result = await calculateReadinessScore(workspaceId, orgId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]/readiness]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
