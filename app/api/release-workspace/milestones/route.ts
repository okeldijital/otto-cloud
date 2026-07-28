import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createMilestoneSchema, updateMilestoneSchema } from "@/types/release-workspace";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const items = await prisma.workspace_milestones.findMany({
      where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },
      orderBy: { sort_order: "asc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[GET /api/release-workspace/milestones]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const userId = (session.user as any).id;
    const body = await req.json();
    const parsed = createMilestoneSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const item = await prisma.workspace_milestones.create({
      data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(parsed.data.due_date) : undefined },
    });

    await prisma.workspace_timeline_events.create({
      data: { workspace_id: parsed.data.workspace_id, user_id: userId, event_type: "milestone", summary: `Milestone added: "${item.name}"` },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/release-workspace/milestones]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const parsed = updateMilestoneSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.workspace_milestones.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = { ...parsed.data };
    if (parsed.data.due_date) updateData.due_date = new Date(parsed.data.due_date);
    if (parsed.data.status === "completed") updateData.completed_at = new Date();

    const updated = await prisma.workspace_milestones.update({ where: { id: parseInt(id) }, data: updateData });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/release-workspace/milestones]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const existing = await prisma.workspace_milestones.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.workspace_milestones.update({ where: { id: parseInt(id) }, data: { is_deleted: true } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/release-workspace/milestones]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
