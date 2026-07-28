import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ctx = await requireOrganization();
    const uuidOrgId = ctx.organizationId;
    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const note = await prisma.notes.findFirst({
        where: { id, organization_id: uuidOrgId, is_deleted: false },
      });
      if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
      return NextResponse.json(note);
    }

    const category = searchParams.get("category");
    const pinned = searchParams.get("pinned");
    const q = searchParams.get("q");
    const relatedEntityType = searchParams.get("related_entity_type");
    const relatedEntityId = searchParams.get("related_entity_id");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: any = { organization_id: uuidOrgId, is_deleted: false };
    if (category) where.category = category;
    if (pinned === "true") where.pinned = true;
    if (pinned === "false") where.pinned = false;
    if (relatedEntityType && relatedEntityId) {
      where.related_entity_type = relatedEntityType;
      where.related_entity_id = parseInt(relatedEntityId);
    }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
      ];
    }

    const notes = await prisma.notes.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ pinned: "desc" }, { created_at: "desc" }],
    });
    return NextResponse.json(notes);
  } catch (err: any) {
    console.error("[GET /api/office/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const uuidOrgId = ctx.organizationId;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "create") {
      const body = await req.json();
      const note = await prisma.notes.create({
        data: {
          title: body.title,
          content: body.content || undefined,
          content_markdown: body.content_markdown || undefined,
          category: body.category || undefined,
          color: body.color || undefined,
          tags: body.tags || undefined,
          pinned: body.pinned || false,
          related_entity_type: body.related_entity_type || undefined,
          related_entity_id: body.related_entity_id ? parseInt(body.related_entity_id) : undefined,
          created_by: userId,
          organization_id: uuidOrgId,
          is_deleted: false,
        },
      });
      return NextResponse.json(note, { status: 201 });
    }

    const body = await req.json();
    const note = await prisma.notes.create({
      data: {
        title: body.title,
        content: body.content || undefined,
        content_markdown: body.content_markdown || undefined,
        category: body.category || undefined,
        color: body.color || undefined,
        tags: body.tags || undefined,
        pinned: body.pinned || false,
        attachments: body.attachments || undefined,
        related_entity_type: body.related_entity_type || undefined,
        related_entity_id: body.related_entity_id ? parseInt(body.related_entity_id) : undefined,
        created_by: userId,
        organization_id: uuidOrgId,
        is_deleted: false,
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/office/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ctx = await requireOrganization();
    const uuidOrgId = ctx.organizationId;
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing note ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.notes.findFirst({ where: { id, organization_id: uuidOrgId, is_deleted: false } });
    if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.notes.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        content: body.content !== undefined ? body.content : undefined,
        content_markdown: body.content_markdown !== undefined ? body.content_markdown : undefined,
        category: body.category !== undefined ? body.category : undefined,
        color: body.color !== undefined ? body.color : undefined,
        tags: body.tags !== undefined ? body.tags : undefined,
        pinned: body.pinned !== undefined ? body.pinned : undefined,
        attachments: body.attachments !== undefined ? body.attachments : undefined,
        related_entity_type: body.related_entity_type !== undefined ? body.related_entity_type : undefined,
        related_entity_id: body.related_entity_id !== undefined ? (body.related_entity_id ? parseInt(body.related_entity_id) : null) : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/office/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ctx = await requireOrganization();
    const uuidOrgId = ctx.organizationId;
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing note ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.notes.findFirst({ where: { id, organization_id: uuidOrgId, is_deleted: false } });
    if (!existing) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    await prisma.notes.update({
      where: { id },
      data: { is_deleted: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/office/notes]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
