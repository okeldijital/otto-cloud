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
      const item = await prisma.status_quo_items.findFirst({
        where: { id, organization_id: orgIdStr },
      });
      if (!item) return NextResponse.json({ error: "Status quo item not found" }, { status: 404 });
      return NextResponse.json(item);
    }

    const entityType = searchParams.get("entity_type");
    const entityId = searchParams.get("entity_id");
    const issueType = searchParams.get("issue_type");
    const severity = searchParams.get("severity");
    const includeResolved = searchParams.get("include_resolved") === "true";
    const q = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: any = { organization_id: orgIdStr };
    if (!includeResolved) where.resolved_at = null;
    if (entityType) where.entity_type = entityType;
    if (entityId) where.entity_id = parseInt(entityId);
    if (issueType) where.issue_type = issueType;
    if (severity) where.severity = severity;
    if (q) where.summary = { contains: q, mode: "insensitive" };

    const items = await prisma.status_quo_items.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[GET /api/office/status-quo]", err);
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

    if (action === "resolve") {
      const body = await req.json();
      const itemId = body.id || parseInt(searchParams.get("id") || "0");
      if (!itemId) return NextResponse.json({ error: "Missing item id" }, { status: 400 });

      const existing = await prisma.status_quo_items.findFirst({
        where: { id: itemId, organization_id: orgIdStr },
      });
      if (!existing) return NextResponse.json({ error: "Status quo item not found" }, { status: 404 });

      const updated = await prisma.status_quo_items.update({
        where: { id: itemId },
        data: {
          resolved_at: new Date(),
          resolved_by_user_id: userId,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "create") {
      const body = await req.json();
      const item = await prisma.status_quo_items.create({
        data: {
          organization_id: orgIdStr,
          entity_type: body.entity_type,
          entity_id: parseInt(body.entity_id),
          issue_type: body.issue_type,
          severity: body.severity || "Medium",
          summary: body.summary,
          details_json: body.details_json || undefined,
        },
      });
      return NextResponse.json(item, { status: 201 });
    }

    const body = await req.json();
    const item = await prisma.status_quo_items.create({
      data: {
        organization_id: orgIdStr,
        entity_type: body.entity_type,
        entity_id: parseInt(body.entity_id),
        issue_type: body.issue_type,
        severity: body.severity || "Medium",
        summary: body.summary,
        details_json: body.details_json || undefined,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/office/status-quo]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing status quo item ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.status_quo_items.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Status quo item not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.status_quo_items.update({
      where: { id },
      data: {
        entity_type: body.entity_type !== undefined ? body.entity_type : undefined,
        entity_id: body.entity_id !== undefined ? parseInt(body.entity_id) : undefined,
        issue_type: body.issue_type !== undefined ? body.issue_type : undefined,
        severity: body.severity !== undefined ? body.severity : undefined,
        summary: body.summary !== undefined ? body.summary : undefined,
        details_json: body.details_json !== undefined ? body.details_json : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/office/status-quo]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing status quo item ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.status_quo_items.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Status quo item not found" }, { status: 404 });

    await prisma.status_quo_items.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/office/status-quo]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
