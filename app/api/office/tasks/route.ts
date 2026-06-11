import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgIdStr = (session.user as any).organization_id;

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const task = await prisma.tasks.findFirst({
        where: { id, organization_id: orgIdStr, is_deleted: false },
      });
      if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      return NextResponse.json(task);
    }

    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedToUserId = searchParams.get("assigned_to_user_id");
    const linkedEntityType = searchParams.get("linked_entity_type");
    const linkedEntityId = searchParams.get("linked_entity_id");
    const sourceType = searchParams.get("source_type");
    const q = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: any = { organization_id: orgIdStr, is_deleted: false };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToUserId) where.assigned_to_user_id = parseInt(assignedToUserId);
    if (linkedEntityType && linkedEntityId) {
      where.linked_entity_type = linkedEntityType;
      where.linked_entity_id = parseInt(linkedEntityId);
    }
    if (sourceType) where.source_type = sourceType;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.tasks.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(tasks);
  } catch (err: any) {
    console.error("[GET /api/office/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const orgIdStr = (session.user as any).organization_id;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "create") {
      const body = await req.json();
      const task = await prisma.tasks.create({
        data: {
          title: body.title,
          description: body.description || undefined,
          status: body.status || "Open",
          priority: body.priority || "Medium",
          due_date: body.due_date ? new Date(body.due_date) : undefined,
          assigned_to_user_id: body.assigned_to_user_id ? parseInt(body.assigned_to_user_id) : undefined,
          created_by_user_id: userId,
          linked_entity_type: body.linked_entity_type || undefined,
          linked_entity_id: body.linked_entity_id ? parseInt(body.linked_entity_id) : undefined,
          source_type: body.source_type || undefined,
          source_id: body.source_id ? parseInt(body.source_id) : undefined,
          organization_id: orgIdStr,
          is_deleted: false,
        },
      });
      return NextResponse.json(task, { status: 201 });
    }

    const body = await req.json();
    const task = await prisma.tasks.create({
      data: {
        title: body.title,
        description: body.description || undefined,
        status: body.status || "Open",
        priority: body.priority || "Medium",
        due_date: body.due_date ? new Date(body.due_date) : undefined,
        assigned_to_user_id: body.assigned_to_user_id ? parseInt(body.assigned_to_user_id) : undefined,
        created_by_user_id: userId,
        linked_entity_type: body.linked_entity_type || undefined,
        linked_entity_id: body.linked_entity_id ? parseInt(body.linked_entity_id) : undefined,
        source_type: body.source_type || undefined,
        source_id: body.source_id ? parseInt(body.source_id) : undefined,
        organization_id: orgIdStr,
        is_deleted: false,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/office/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing task ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.tasks.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.tasks.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        description: body.description !== undefined ? body.description : undefined,
        status: body.status !== undefined ? body.status : undefined,
        priority: body.priority !== undefined ? body.priority : undefined,
        due_date: body.due_date !== undefined ? (body.due_date ? new Date(body.due_date) : null) : undefined,
        assigned_to_user_id: body.assigned_to_user_id !== undefined ? (body.assigned_to_user_id ? parseInt(body.assigned_to_user_id) : null) : undefined,
        linked_entity_type: body.linked_entity_type !== undefined ? body.linked_entity_type : undefined,
        linked_entity_id: body.linked_entity_id !== undefined ? (body.linked_entity_id ? parseInt(body.linked_entity_id) : null) : undefined,
        source_type: body.source_type !== undefined ? body.source_type : undefined,
        source_id: body.source_id !== undefined ? (body.source_id ? parseInt(body.source_id) : null) : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/office/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing task ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.tasks.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    await prisma.tasks.update({
      where: { id },
      data: { is_deleted: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/office/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
