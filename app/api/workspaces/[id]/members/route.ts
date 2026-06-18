import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addMemberSchema, updateMemberSchema } from "@/types/workspaces";

async function getWorkspace(orgId: string, workspaceId: number) {
  const ws = await prisma.workspaces.findUnique({ where: { id: workspaceId } });
  if (!ws) return null;
  if (ws.organization_id !== orgId) return null;
  return ws;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const { id } = await params;
    const workspaceId = parseInt(id);

    const workspace = await getWorkspace(orgId, workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const members = await prisma.workspace_members.findMany({
      where: { workspace_id: workspaceId },
      include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } },
      orderBy: { role: "asc" },
    });

    return NextResponse.json(members);
  } catch (err: any) {
    console.error("[GET /api/workspaces/:id/members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const userId = (session.user as any).id;
    const { id } = await params;
    const workspaceId = parseInt(id);
    const body = await req.json();

    const workspace = await getWorkspace(orgId, workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    const member = await prisma.workspace_members.create({
      data: { workspace_id: workspaceId, ...parsed.data },
    });

    await prisma.workspace_timeline_events.create({
      data: {
        workspace_id: workspaceId,
        user_id: userId,
        event_type: "member_added",
        summary: parsed.data.name
          ? `Member "${parsed.data.name}" added as ${parsed.data.role}`
          : `User #${parsed.data.user_id} added as ${parsed.data.role}`,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspaces/:id/members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const { id } = await params;
    const workspaceId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const memberId = parseInt(searchParams.get("member_id") || "");

    if (!memberId) return NextResponse.json({ error: "Missing member_id" }, { status: 400 });

    const workspace = await getWorkspace(orgId, workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.workspace_members.update({
      where: { id: memberId },
      data: parsed.data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/workspaces/:id/members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const { id } = await params;
    const workspaceId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const memberId = parseInt(searchParams.get("member_id") || "");

    if (!memberId) return NextResponse.json({ error: "Missing member_id" }, { status: 400 });

    const workspace = await getWorkspace(orgId, workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    await prisma.workspace_members.delete({ where: { id: memberId } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspaces/:id/members]", err);
    return NextResponse.json({ error: `Could not remove member: ${err.message}` }, { status: 400 });
  }
}
