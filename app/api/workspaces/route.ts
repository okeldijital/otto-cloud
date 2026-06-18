import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createWorkspaceSchema } from "@/types/workspaces";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const { searchParams } = new URL(req.url);

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const workspace = await prisma.workspaces.findUnique({
        where: { id },
        include: {
          template: {
            include: { sections: { orderBy: { sort_order: "asc" } }, statuses: { orderBy: { sort_order: "asc" } } },
          },
          members: { include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } } },
          timeline_events: { orderBy: { created_at: "desc" }, take: 50, include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          files: { orderBy: { created_at: "desc" } },
          notifications: { orderBy: { created_at: "desc" }, take: 20 },
        },
      });
      if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      if (workspace.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      return NextResponse.json(workspace);
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const status = searchParams.get("status");
    const template_id = searchParams.get("template_id") ? parseInt(searchParams.get("template_id")!) : undefined;
    const search = searchParams.get("search");

    const where: any = { organization_id: orgId, is_deleted: false };
    if (status) where.status = status;
    if (template_id) where.template_id = template_id;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const [workspaces, total] = await Promise.all([
      prisma.workspaces.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updated_at: "desc" },
        include: {
          template: { select: { name: true, slug: true, icon: true, color: true } },
          members: { include: { user: { select: { id: true, name: true, avatar_url: true } } } },
          _count: { select: { files: true, timeline_events: true } },
        },
      }),
      prisma.workspaces.count({ where }),
    ]);

    return NextResponse.json({ total, items: workspaces });
  } catch (err: any) {
    console.error("[GET /api/workspaces]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    const userId = (session.user as any).id;
    const body = await req.json();

    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.workspaces.findFirst({
      where: { organization_id: orgId, name: parsed.data.name, is_deleted: false },
    });
    if (existing) {
      return NextResponse.json({ error: `A workspace named '${parsed.data.name}' already exists.` }, { status: 409 });
    }

    const workspace = await prisma.workspaces.create({
      data: {
        ...parsed.data,
        organization_id: orgId,
        created_by: userId,
      },
    });

    // Add creator as owner member
    await prisma.workspace_members.create({
      data: { workspace_id: workspace.id, user_id: userId, role: "owner" },
    });

    // Log timeline event
    await prisma.workspace_timeline_events.create({
      data: {
        workspace_id: workspace.id,
        user_id: userId,
        event_type: "system",
        summary: `Workspace "${workspace.name}" created`,
      },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspaces]", err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A workspace with this name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
