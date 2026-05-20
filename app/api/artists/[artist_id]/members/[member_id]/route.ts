import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** DELETE /api/artists/[artist_id]/members/[member_id] */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ artist_id: string; member_id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { artist_id, member_id } = await params;
    const groupId = parseInt(artist_id);
    const memberId = parseInt(member_id);

    const membership = await prisma.artist_memberships.findFirst({
      where: { group_id: groupId, member_id: memberId },
    });
    if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

    await prisma.artist_memberships.delete({ where: { id: membership.id } });

    const updated = await prisma.artists.findUnique({
      where: { id: groupId },
      include: {
        artist_memberships_artist_memberships_group_idToartists: {
          include: { artists_artist_memberships_member_idToartists: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[DELETE /api/artists/[id]/members/[mid]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
