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
    const orgId = ctx.organizationId;
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const [items, total] = await Promise.all([
      prisma.works_admin.findMany({
        where: { organization_id: orgId },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          works: { select: { id: true, title: true } },
        },
      }),
      prisma.works_admin.count({ where: { organization_id: orgId } }),
    ]);
    return NextResponse.json({ total, items });
  } catch (err: any) {
    console.error("[GET /api/admin-of-works/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const newItem = await prisma.works_admin.create({
      data: {
        id: body.id || crypto.randomUUID(),
        organization_id: orgId,
        work_id: parseInt(body.work_id),
        registration_status: body.registration_status || "Pending",
        registered_with: body.registered_with,
        registration_date: body.registration_date ? new Date(body.registration_date) : null,
        registration_reference: body.registration_reference,
        notes: body.notes,
        created_by: (session.user as any).id ? parseInt((session.user as any).id) : null,
      },
    });
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admin-of-works/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing works admin ID" }, { status: 400 });

    const body = await req.json();
    const updated = await prisma.works_admin.update({
      where: { id: idStr },
      data: {
        registration_status: body.registration_status !== undefined ? body.registration_status : undefined,
        registered_with: body.registered_with !== undefined ? body.registered_with : undefined,
        registration_date: body.registration_date !== undefined ? new Date(body.registration_date) : undefined,
        registration_reference: body.registration_reference !== undefined ? body.registration_reference : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/admin-of-works/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing works admin ID" }, { status: 400 });

    await prisma.works_admin_documents.deleteMany({ where: { works_admin_id: idStr } });
    await prisma.works_admin.delete({ where: { id: idStr } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/admin-of-works/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
