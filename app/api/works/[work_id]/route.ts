import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ work_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { work_id } = await params;
    const id = parseInt(work_id);

    const work = await prisma.works.findUnique({ where: { id } });
    if (!work || work.is_deleted) return NextResponse.json({ error: "Work not found" }, { status: 404 });

    return NextResponse.json(work);
  } catch (err: any) {
    console.error("[GET /api/works/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ work_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { work_id } = await params;
    const id = parseInt(work_id);
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
    console.error("[PUT /api/works/[id]]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This work title or ISWC might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ work_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { work_id } = await params;
    const id = parseInt(work_id);

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
    console.error("[DELETE /api/works/[id]]", err);
    return NextResponse.json({ error: `Cannot delete work due to server error: ${err.message}` }, { status: 409 });
  }
}
