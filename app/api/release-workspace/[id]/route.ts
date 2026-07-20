import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const { id: idStr } = await params;
    const id = parseInt(idStr);

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
          orderBy: { created_at: "desc" }, take: 50,
          include: { user: { select: { id: true, name: true, avatar_url: true } } },
        },
        files: { orderBy: { created_at: "desc" }, take: 50 },
        notifications: { orderBy: { created_at: "desc" }, take: 20 },
        deliverables: { where: { is_deleted: false }, orderBy: { sort_order: "asc" } },
        milestones: { where: { is_deleted: false }, orderBy: { sort_order: "asc" } },
        approvals: { where: { is_deleted: false }, orderBy: { created_at: "desc" } },
        publications: { where: { is_deleted: false }, orderBy: { created_at: "desc" } },
        videos: { where: { is_deleted: false }, orderBy: { created_at: "desc" } },
        marketing_phases: {
          where: { is_deleted: false },
          orderBy: { sort_order: "asc" },
          include: { tasks: { where: { is_deleted: false }, orderBy: { sort_order: "asc" } } },
        },
        discussion_channels: {
          where: { is_deleted: false },
          orderBy: { sort_order: "asc" },
          include: { messages: { orderBy: { created_at: "asc" }, take: 50 } },
        },
        readiness_scores: { orderBy: { calculated_at: "desc" }, take: 1 },
      },
    });

    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (workspace.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(workspace);
  } catch (err: any) {
    console.error("[GET /api/release-workspace/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const userId = (session.user as any).id;
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await req.json();

    const existing = await prisma.workspaces.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const oldStatus = existing.status;
    const updated = await prisma.workspaces.update({ where: { id }, data: body });

    if (body.status && body.status !== oldStatus) {
      await prisma.workspace_timeline_events.create({
        data: {
          workspace_id: id,
          user_id: userId,
          event_type: "status_change",
          summary: `Status changed from "${oldStatus}" to "${body.status}"`,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/release-workspace/:id]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
