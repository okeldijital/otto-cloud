import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { calculateReadinessScore } from "@/app/api/release-workspace/route";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const result = await calculateReadinessScore(parseInt(workspaceId), orgId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GET /api/release-workspace/readiness]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
