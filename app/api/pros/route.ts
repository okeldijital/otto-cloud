import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parseInt(idStr);
      const relation = searchParams.get("relation");

      if (relation === "artists") {
        const artists = await prisma.artists.findMany({ where: { pro_id: id } });
        return NextResponse.json(artists);
      }

      if (relation === "works") {
        const works = await prisma.works.findMany({ where: { pro_id: id, is_deleted: false } });
        return NextResponse.json(works);
      }

      const pro = await prisma.pros.findUnique({ where: { id } });
      if (!pro) return NextResponse.json({ error: "PRO not found" }, { status: 404 });
      return NextResponse.json(pro);
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const items = await prisma.pros.findMany({ skip, take: limit, orderBy: { name: "asc" } });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[GET /api/pros]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const existing = await prisma.pros.findFirst({ where: { name: body.name } });
    if (existing) {
      return NextResponse.json(
        { error: `A PRO with the name '${body.name}' already exists.` },
        { status: 409 }
      );
    }

    const newItem = await prisma.pros.create({ data: body });
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/pros]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This PRO name or ID might already exist." },
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
    if (!idStr) return NextResponse.json({ error: "Missing PRO ID" }, { status: 400 });
    const id = parseInt(idStr);

    const body = await req.json();

    const existing = await prisma.pros.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "PRO not found" }, { status: 404 });

    if (body.name && body.name !== existing.name) {
      const dup = await prisma.pros.findFirst({ where: { name: body.name } });
      if (dup) {
        return NextResponse.json(
          { error: `A PRO with the name '${body.name}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.pros.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/pros]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This PRO name or ID might already be in use." },
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
    if (!idStr) return NextResponse.json({ error: "Missing PRO ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.pros.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "PRO not found" }, { status: 404 });

    await prisma.pros.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/pros]", err);
    if (err.code === "P2003" || err.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete PRO because it is associated with artists or works." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
