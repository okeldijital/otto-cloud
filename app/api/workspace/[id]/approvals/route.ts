import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createApprovalSchema, updateApprovalSchema } from "@/types/release-workspace";
import { calculateReadinessScore } from "@/app/api/release-workspace/route";
import { notifyApprovalRequested, notifyApprovalResolved } from "@/lib/workspace-engine/notifications";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).organization_id;
    const workspaceId = wpId;
    const items = await prisma.workspace_approvals.findMany({
      where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]/approvals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).organization_id;
    const userId = (session.user as any).id;
    const workspaceId = wpId;
    const body = await req.json();
    const parsed = createApprovalSchema.safeParse({ ...body, workspace_id: workspaceId });
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const item = await prisma.workspace_approvals.create({
      data: { ...parsed.data, organization_id: orgId, requested_by: userId, due_date: parsed.data.due_date ? new Date(parsed.data.due_date) : undefined },
    });

    await prisma.workspace_timeline_events.create({
      data: { workspace_id: workspaceId, user_id: userId, event_type: "approval", summary: `Approval requested: "${item.name}"` },
    });

    await notifyApprovalRequested({ id: item.id, name: item.name, workspace_id: workspaceId }, orgId);

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspace/[id]/approvals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).organization_id;
    const userId = (session.user as any).id;
    const workspaceId = wpId;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");
    if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const parsed = updateApprovalSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.workspace_approvals.findUnique({ where: { id: parseInt(itemId) } });
    if (!existing || existing.workspace_id !== workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = { ...parsed.data };
    if (parsed.data.status === "approved") {
      updateData.approved_by = userId;
      updateData.approved_at = new Date();
    }

    const updated = await prisma.workspace_approvals.update({ where: { id: parseInt(itemId) }, data: updateData });

    await prisma.workspace_timeline_events.create({
      data: { workspace_id: workspaceId, user_id: userId, event_type: "approval", summary: `Approval "${existing.name}" → ${parsed.data.status || "updated"}` },
    });

    if (parsed.data.status && (parsed.data.status === "approved" || parsed.data.status === "rejected" || parsed.data.status === "changes_requested")) {
      await notifyApprovalResolved(
        { id: existing.id, name: existing.name, workspace_id: workspaceId, requested_by: existing.requested_by },
        orgId,
        parsed.data.status
      );
    }

    await calculateReadinessScore(workspaceId, orgId);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/workspace/[id]/approvals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = wpId;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");
    if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.workspace_approvals.findUnique({ where: { id: parseInt(itemId) } });
    if (!existing || existing.workspace_id !== workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.workspace_approvals.update({ where: { id: parseInt(itemId) }, data: { is_deleted: true } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspace/[id]/approvals]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
