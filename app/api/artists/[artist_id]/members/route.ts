import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET  /api/artists/[artist_id]/members  — list members of a group */
export async function GET(req: Request, { params }: { params: Promise<{ artist_id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { artist_id } = await params;
  const id = parseInt(artist_id);

  const memberships = await prisma.artist_memberships.findMany({
    where: { group_id: id },
    include: { artists_artist_memberships_member_idToartists: true },
  });

  return NextResponse.json(
    memberships.map((m) => ({
      id: m.id,
      member_id: m.member_id,
      role: m.role,
      artist: m.artists_artist_memberships_member_idToartists,
    }))
  );
}

/** POST /api/artists/[artist_id]/members  — add a member */
export async function POST(req: Request, { params }: { params: Promise<{ artist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { artist_id } = await params;
    const id = parseInt(artist_id);
    const body = await req.json();
    const { member_id, role } = body;

    if (!member_id) return NextResponse.json({ error: "member_id is required" }, { status: 422 });

    const group = await prisma.artists.findUnique({ where: { id } });
    if (!group) return NextResponse.json({ error: "Group artist not found" }, { status: 404 });
    if ((group.artist_kind || "solo") !== "group")
      return NextResponse.json({ error: "Artist is not a group" }, { status: 400 });

    const member = await prisma.artists.findUnique({ where: { id: member_id } });
    if (!member) return NextResponse.json({ error: `Member artist #${member_id} not found` }, { status: 404 });
    if ((member.artist_kind || "solo") !== "solo")
      return NextResponse.json({ error: "Group members must be individual artists" }, { status: 400 });

    const dup = await prisma.artist_memberships.findFirst({
      where: { group_id: id, member_id },
    });
    if (dup) return NextResponse.json({ error: "Member already in group" }, { status: 409 });

    await prisma.artist_memberships.create({ data: { group_id: id, member_id, role } });

    const full = await prisma.artists.findUnique({
      where: { id },
      include: {
        artist_memberships_artist_memberships_group_idToartists: {
          include: { artists_artist_memberships_member_idToartists: true },
        },
      },
    });

    return NextResponse.json(full, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/artists/[id]/members]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
