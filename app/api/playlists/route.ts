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
      const playlist = await prisma.playlists.findUnique({ where: { id } });
      if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
      return NextResponse.json(playlist);
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const [items, total] = await Promise.all([
      prisma.playlists.findMany({ skip, take: limit, orderBy: { name: "asc" } }),
      prisma.playlists.count(),
    ]);
    return NextResponse.json({ total, items });
  } catch (err: any) {
    console.error("[GET /api/playlists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const existing = await prisma.playlists.findFirst({ where: { name: body.name } });
    if (existing) {
      return NextResponse.json({ error: `A playlist with the name '${body.name}' already exists.` }, { status: 409 });
    }

    const newItem = await prisma.playlists.create({ data: body });
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/playlists]", err);
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A playlist with this name already exists." }, { status: 409 });
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
    if (!idStr) return NextResponse.json({ error: "Missing playlist ID" }, { status: 400 });
    const id = parseInt(idStr);

    const body = await req.json();
    const existing = await prisma.playlists.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

    if (body.name && body.name !== existing.name) {
      const dup = await prisma.playlists.findFirst({ where: { name: body.name } });
      if (dup) return NextResponse.json({ error: `A playlist with the name '${body.name}' already exists.` }, { status: 409 });
    }

    const updated = await prisma.playlists.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/playlists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing playlist ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.playlists.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });

    await prisma.playlists.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/playlists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
