import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = wpId;
    const events = await prisma.workspace_timeline_events.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: "desc" },
      take: 100,
      include: { user: { select: { id: true, name: true, avatar_url: true } } },
    });
    return NextResponse.json(events);
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]/timeline]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const workspaceId = wpId;
    const body = await req.json();
    if (!body.summary) return NextResponse.json({ error: "summary required" }, { status: 400 });

    const event = await prisma.workspace_timeline_events.create({
      data: { workspace_id: workspaceId, user_id: userId, event_type: body.event_type || "note", summary: body.summary },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspace/[id]/timeline]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");
    if (!eventId) return NextResponse.json({ error: "id required" }, { status: 400 });

    await prisma.workspace_timeline_events.delete({ where: { id: parseInt(eventId) } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspace/[id]/timeline]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
