import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateWorkspaceSchema } from "@/types/workspaces";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const id = parseInt(params.id);

    const workspace = await prisma.workspaces.findUnique({
      where: { id },
      include: {
        template: {
          include: { sections: { orderBy: { sort_order: "asc" } }, statuses: { orderBy: { sort_order: "asc" } } },
        },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } },
          orderBy: { role: "asc" },
        },
        timeline_events: {
          orderBy: { created_at: "desc" },
          take: 50,
          include: { user: { select: { id: true, name: true, avatar_url: true } } },
        },
        files: { orderBy: { created_at: "desc" }, take: 50 },
        notifications: { orderBy: { created_at: "desc" }, take: 20 },
      },
    });

    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (workspace.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(workspace);
  } catch (err: any) {
    console.error("[GET /api/workspaces/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const userId = (session.user as any).id;
    const id = parseInt(params.id);
    const body = await req.json();

    const existing = await prisma.workspaces.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const parsed = updateWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    const oldStatus = existing.status;
    const updated = await prisma.workspaces.update({ where: { id }, data: parsed.data });

    // Log status change
    if (parsed.data.status && parsed.data.status !== oldStatus) {
      await prisma.workspace_timeline_events.create({
        data: {
          workspace_id: id,
          user_id: userId,
          event_type: "status_change",
          summary: `Status changed from "${oldStatus}" to "${parsed.data.status}"`,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/workspaces/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const id = parseInt(params.id);

    const existing = await prisma.workspaces.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.workspaces.update({ where: { id }, data: { is_deleted: true } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspaces/:id]", err);
    return NextResponse.json({ error: `Could not delete workspace: ${err.message}` }, { status: 400 });
  }
}
