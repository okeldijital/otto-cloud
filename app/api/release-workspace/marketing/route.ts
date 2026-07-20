import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createMarketingPhaseSchema, updateMarketingPhaseSchema, createMarketingTaskSchema, updateMarketingTaskSchema } from "@/types/release-workspace";
import { calculateReadinessScore } from "@/app/api/release-workspace/route";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const phases = await prisma.workspace_marketing_phases.findMany({
      where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },
      orderBy: { sort_order: "asc" },
      include: { tasks: { where: { is_deleted: false }, orderBy: { sort_order: "asc" } } },
    });
    return NextResponse.json(phases);
  } catch (err: any) {
    console.error("[GET /api/release-workspace/marketing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const userId = (session.user as any).id;
    const body = await req.json();

    if (body._type === "task") {
      const parsed = createMarketingTaskSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
      const task = await prisma.workspace_marketing_tasks.create({
        data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(parsed.data.due_date) : undefined },
      });
      return NextResponse.json(task, { status: 201 });
    }

    const parsed = createMarketingPhaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const phase = await prisma.workspace_marketing_phases.create({
      data: {
        ...parsed.data,
        organization_id: orgId,
        created_by: userId,
        start_date: parsed.data.start_date ? new Date(parsed.data.start_date) : undefined,
        end_date: parsed.data.end_date ? new Date(parsed.data.end_date) : undefined,
      },
    });

    await prisma.workspace_timeline_events.create({
      data: { workspace_id: parsed.data.workspace_id, user_id: userId, event_type: "milestone", summary: `Marketing phase added: "${phase.name}"` },
    });

    return NextResponse.json(phase, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/release-workspace/marketing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "phase";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();

    if (type === "task") {
      const parsed = updateMarketingTaskSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
      const existing = await prisma.workspace_marketing_tasks.findUnique({ where: { id: parseInt(id) } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const updateData: any = { ...parsed.data };
      if (parsed.data.due_date) updateData.due_date = new Date(parsed.data.due_date);
      const updated = await prisma.workspace_marketing_tasks.update({ where: { id: parseInt(id) }, data: updateData });
      const phase = await prisma.workspace_marketing_phases.findUnique({ where: { id: existing.phase_id } });
      if (phase) await calculateReadinessScore(phase.workspace_id, orgId);
      return NextResponse.json(updated);
    }

    const parsed = updateMarketingPhaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    const existing = await prisma.workspace_marketing_phases.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updateData: any = { ...parsed.data };
    if (parsed.data.start_date) updateData.start_date = new Date(parsed.data.start_date);
    if (parsed.data.end_date) updateData.end_date = new Date(parsed.data.end_date);

    const updated = await prisma.workspace_marketing_phases.update({ where: { id: parseInt(id) }, data: updateData });
    await calculateReadinessScore(existing.workspace_id, orgId);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/release-workspace/marketing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") || "phase";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (type === "task") {
      const existing = await prisma.workspace_marketing_tasks.findUnique({ where: { id: parseInt(id) } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.workspace_marketing_tasks.update({ where: { id: parseInt(id) }, data: { is_deleted: true } });
    } else {
      const existing = await prisma.workspace_marketing_phases.findUnique({ where: { id: parseInt(id) } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
      await prisma.workspace_marketing_phases.update({ where: { id: parseInt(id) }, data: { is_deleted: true } });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/release-workspace/marketing]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
