import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTimelineEventSchema } from "@/types/workspaces";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const workspaceId = parseInt(params.id);

    const workspace = await prisma.workspaces.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const [events, total] = await Promise.all([
      prisma.workspace_timeline_events.findMany({
        where: { workspace_id: workspaceId },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, avatar_url: true } } },
      }),
      prisma.workspace_timeline_events.count({ where: { workspace_id: workspaceId } }),
    ]);

    return NextResponse.json({ total, items: events });
  } catch (err: any) {
    console.error("[GET /api/workspaces/:id/timeline]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const userId = (session.user as any).id;
    const workspaceId = parseInt(params.id);
    const body = await req.json();

    const workspace = await prisma.workspaces.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const parsed = createTimelineEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    const event = await prisma.workspace_timeline_events.create({
      data: { workspace_id: workspaceId, user_id: userId, ...parsed.data },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspaces/:id/timeline]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
