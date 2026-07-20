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
    const { id } = await params;
    const workspaceId = parseInt(id);

    const workspace = await prisma.workspaces.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const notifications = await prisma.workspace_notifications.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (err: any) {
    console.error("[GET /api/workspaces/:id/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const { id } = await params;
    const workspaceId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const notificationId = parseInt(searchParams.get("notification_id") || "");
    const markAll = searchParams.get("all") === "true";

    const workspace = await prisma.workspaces.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (markAll) {
      await prisma.workspace_notifications.updateMany({
        where: { workspace_id: workspaceId, is_read: false },
        data: { is_read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (!notificationId) return NextResponse.json({ error: "Missing notification_id" }, { status: 400 });

    await prisma.workspace_notifications.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT /api/workspaces/:id/notifications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
