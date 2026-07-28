import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { buildDag } from "@/lib/workspace-engine/dag";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const deps = await prisma.workspace_deliverable_dependencies.findMany({
      where: { workspace_id: wpId, organization_id: orgId },
    });

    const deliverables = await prisma.workspace_deliverables.findMany({
      where: { workspace_id: wpId, organization_id: orgId, is_deleted: false },
      select: { id: true, name: true, status: true, priority: true, due_date: true },
    });

    const edges = deps.map((d) => ({
      sourceId: d.source_id,
      targetId: d.target_id,
      type: d.dependency_type,
    }));

    const dag = buildDag(edges, deliverables);

    return NextResponse.json({ dependencies: deps, dag });
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]/dependencies]", err);
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
    const userId = parseInt((session.user as any).id) || undefined;

    const body = await req.json();
    const { source_id, target_id, dependency_type } = body;

    if (!source_id || !target_id) {
      return NextResponse.json({ error: "source_id and target_id required" }, { status: 400 });
    }

    if (source_id === target_id) {
      return NextResponse.json({ error: "Cannot depend on itself" }, { status: 400 });
    }

    const dep = await prisma.workspace_deliverable_dependencies.create({
      data: {
        workspace_id: wpId,
        organization_id: orgId,
        source_id: parseInt(source_id),
        target_id: parseInt(target_id),
        dependency_type: dependency_type || "blocks",
        created_by: userId,
      },
    });

    await prisma.workspace_timeline_events.create({
      data: {
        workspace_id: wpId, user_id: userId,
        event_type: "dependency", summary: `Dependency added: #${source_id} → #${target_id}`,
      },
    });

    return NextResponse.json(dep, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Dependency already exists" }, { status: 409 });
    }
    console.error("[POST /api/workspace/[id]/dependencies]", err);
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
    const { searchParams } = new URL(req.url);
    const sourceId = searchParams.get("source_id");
    const targetId = searchParams.get("target_id");

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: "source_id and target_id required" }, { status: 400 });
    }

    await prisma.workspace_deliverable_dependencies.deleteMany({
      where: {
        workspace_id: wpId,
        organization_id: orgId,
        source_id: parseInt(sourceId),
        target_id: parseInt(targetId),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspace/[id]/dependencies]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
