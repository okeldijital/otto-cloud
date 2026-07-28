import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createDeliverableSchema, updateDeliverableSchema } from "@/types/release-workspace";
import { calculateReadinessScore } from "@/app/api/release-workspace/route";
import { notifyDeliverableBlocked } from "@/lib/workspace-engine/notifications";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const workspaceId = wpId;
    const items = await prisma.workspace_deliverables.findMany({
      where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },
      orderBy: { sort_order: "asc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]/deliverables]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const userId = (session.user as any).id;
    const workspaceId = wpId;
    const body = await req.json();
    const parsed = createDeliverableSchema.safeParse({ ...body, workspace_id: workspaceId });
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const item = await prisma.workspace_deliverables.create({
      data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(parsed.data.due_date) : undefined },
    });

    await prisma.workspace_timeline_events.create({
      data: { workspace_id: workspaceId, user_id: userId, event_type: "milestone", summary: `Deliverable added: "${item.name}"` },
    });

    await calculateReadinessScore(workspaceId, orgId);
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspace/[id]/deliverables]", err);
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
    const userId = (session.user as any).id;
    const workspaceId = wpId;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");
    if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const parsed = updateDeliverableSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.workspace_deliverables.findUnique({ where: { id: parseInt(itemId) } });
    if (!existing || existing.workspace_id !== workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = { ...parsed.data };
    if (parsed.data.due_date) updateData.due_date = new Date(parsed.data.due_date);

    const updated = await prisma.workspace_deliverables.update({ where: { id: parseInt(itemId) }, data: updateData });

    if (parsed.data.status && parsed.data.status !== existing.status) {
      await prisma.workspace_timeline_events.create({
        data: { workspace_id: workspaceId, user_id: userId, event_type: "status_change", summary: `Deliverable "${existing.name}" status: ${parsed.data.status}` },
      });

      if (parsed.data.status === "blocked") {
        await notifyDeliverableBlocked(
          { id: existing.id, name: existing.name, workspace_id: workspaceId },
          orgId
        );
      }
    }

    await calculateReadinessScore(workspaceId, orgId);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/workspace/[id]/deliverables]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = wpId;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");
    if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.workspace_deliverables.findUnique({ where: { id: parseInt(itemId) } });
    if (!existing || existing.workspace_id !== workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.workspace_deliverables.update({ where: { id: parseInt(itemId) }, data: { is_deleted: true } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspace/[id]/deliverables]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
