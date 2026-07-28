import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { notifyWorkspaceStatusChange } from "@/lib/workspace-engine/notifications";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const workspace = await prisma.workspaces.findUnique({
      where: { id: wpId },
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

    if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (workspace.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(workspace);
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const body = await req.json();

    const existing = await prisma.workspaces.findUnique({ where: { id: wpId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.workspaces.update({
      where: { id: wpId },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        status: body.status !== undefined ? body.status : undefined,
      },
    });

    if (body.status && body.status !== existing.status) {
      await notifyWorkspaceStatusChange(
        { id: existing.id, name: existing.name },
        orgId,
        existing.status,
        body.status
      );
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/workspace/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const existing = await prisma.workspaces.findUnique({ where: { id: wpId } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.workspaces.update({ where: { id: wpId }, data: { is_deleted: true } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspace/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
