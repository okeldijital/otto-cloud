import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parseInt(idStr);
      const work = await prisma.works.findFirst({
        where: { id, organization_id: orgId, is_deleted: false },
      });
      if (!work) return NextResponse.json({ error: "Work not found" }, { status: 404 });
      return NextResponse.json(work);
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const [works, total] = await Promise.all([
      prisma.works.findMany({
        where: { organization_id: orgId, is_deleted: false },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.works.count({ where: { organization_id: orgId, is_deleted: false } }),
    ]);

    return NextResponse.json({ total, items: works });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const existing = await prisma.works.findFirst({
      where: { title: body.title, organization_id: orgId },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A musical work with the title '${body.title}' already exists.` },
        { status: 409 }
      );
    }

    const newWork = await prisma.works.create({
      data: { ...body, organization_id: orgId },
    });
    return NextResponse.json(newWork, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/works]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A musical work with this Title or ISWC already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing work ID" }, { status: 400 });
    const id = parseInt(idStr);

    const body = await req.json();

    const existing = await prisma.works.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return NextResponse.json({ error: "Work not found" }, { status: 404 });

    if (body.title && body.title !== existing.title) {
      const dup = await prisma.works.findFirst({ where: { title: body.title } });
      if (dup) {
        return NextResponse.json(
          { error: `A musical work with the title '${body.title}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.works.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/works]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This work title or ISWC might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing work ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.works.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) return NextResponse.json({ error: "Work not found" }, { status: 404 });

    // Nullify track links
    await prisma.tracks.updateMany({ where: { work_id: id }, data: { work_id: null } });

    // Delete works_admin record
    await prisma.works_admin.deleteMany({ where: { work_id: id } });

    // Delete royalties linked to work
    await prisma.royalties.deleteMany({ where: { work_id: id } });

    // Delete contract assets for this work
    await prisma.contract_assets.deleteMany({ where: { asset_id: id, asset_type: "Work" } });

    // Delete status_quo items
    await prisma.status_quo_items.deleteMany({ where: { entity_id: id, entity_type: "Work" } });

    await prisma.works.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/works]", err);
    return NextResponse.json({ error: `Cannot delete work due to server error: ${err.message}` }, { status: 409 });
  }
}
