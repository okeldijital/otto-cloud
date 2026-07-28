import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createPlaybookSchema, updatePlaybookSchema, applyPlaybookSchema } from "@/types/release-workspace";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const items = await prisma.release_playbooks.findMany({
      where: { organization_id: orgId },
      orderBy: { name: "asc" },
      include: {
        playbook_tasks: { orderBy: { sort_order: "asc" } },
        playbook_milestones: { orderBy: { sort_order: "asc" } },
        playbook_deliverables: { orderBy: { sort_order: "asc" } },
        playbook_approvals: { orderBy: { sort_order: "asc" } },
      },
    });

    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[GET /api/release-workspace/playbook]", err);
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

    const { _apply, ...playbookData } = body;

    if (_apply) {
      const parsed = applyPlaybookSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

      const playbook = await prisma.release_playbooks.findUnique({
        where: { id: parsed.data.playbook_id },
        include: { playbook_tasks: true, playbook_milestones: true, playbook_deliverables: true, playbook_approvals: true },
      });

      if (!playbook) return NextResponse.json({ error: "Playbook not found" }, { status: 404 });

      const workspaceId = parsed.data.workspace_id;

      for (const task of playbook.playbook_tasks) {
        await prisma.workspace_deliverables.create({
          data: {
            workspace_id: workspaceId, organization_id: orgId, name: task.title,
            description: task.description, deliverable_type: "task",
            status: "not_started", priority: task.priority || "medium",
            sort_order: task.sort_order, created_by: userId,
          },
        });
      }

      for (const milestone of playbook.playbook_milestones) {
        await prisma.workspace_milestones.create({
          data: {
            workspace_id: workspaceId, organization_id: orgId, name: milestone.name,
            description: milestone.description, section: milestone.section,
            sort_order: milestone.sort_order, created_by: userId,
          },
        });
      }

      for (const deliverable of playbook.playbook_deliverables) {
        await prisma.workspace_deliverables.create({
          data: {
            workspace_id: workspaceId, organization_id: orgId, name: deliverable.name,
            description: deliverable.description, deliverable_type: deliverable.deliverable_type || "deliverable",
            status: "not_started", sort_order: deliverable.sort_order, created_by: userId,
          },
        });
      }

      for (const approval of playbook.playbook_approvals) {
        await prisma.workspace_approvals.create({
          data: {
            workspace_id: workspaceId, organization_id: orgId, name: approval.name,
            description: approval.description, item_type: approval.item_type || "general",
            status: "pending", requested_by: userId,
          },
        });
      }

      await prisma.workspace_timeline_events.create({
        data: {
          workspace_id: workspaceId, user_id: userId, event_type: "system",
          summary: `Playbook "${playbook.name}" applied`,
        },
      });

      return NextResponse.json({ success: true, playbook: playbook.name });
    }

    const parsed = createPlaybookSchema.safeParse(playbookData);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.release_playbooks.findFirst({
      where: { organization_id: orgId, slug: parsed.data.slug },
    });
    if (existing) return NextResponse.json({ error: "A playbook with this slug already exists" }, { status: 409 });

    const playbook = await prisma.release_playbooks.create({
      data: { ...parsed.data, organization_id: orgId, created_by: userId },
    });

    return NextResponse.json(playbook, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/release-workspace/playbook]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const parsed = updatePlaybookSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const updated = await prisma.release_playbooks.update({ where: { id: parseInt(id) }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/release-workspace/playbook]", err);
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
    await prisma.release_playbooks.delete({ where: { id: parseInt(id) } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/release-workspace/playbook]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
