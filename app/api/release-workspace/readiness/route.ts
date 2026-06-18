import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { calculateReadinessScore } from "@/app/api/release-workspace/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const orgId = (session.user as any).organization_id;

    const result = await calculateReadinessScore(parseInt(workspaceId), orgId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GET /api/release-workspace/readiness]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
