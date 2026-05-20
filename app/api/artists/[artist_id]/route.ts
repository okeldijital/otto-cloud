import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function serializeArtist(artist: any) {
  const data: any = {
    id: artist.id,
    artist_id: artist.artist_id,
    name: artist.name,
    aka: artist.aka,
    artist_kind: artist.artist_kind || "solo",
    display_name: artist.display_name,
    nationality: artist.nationality,
    id_number: artist.id_number,
    ipi_number: artist.ipi_number,
    contact_email: artist.contact_email,
    contact_phone: artist.contact_phone,
    physical_address: artist.physical_address,
    banking_details: artist.banking_details,
    profile_image_url: artist.profile_image_url,
    streaming_links: artist.streaming_links,
    social_media: artist.social_media,
    label_id: artist.label_id,
    publisher_id: artist.publisher_id,
    pro_id: artist.pro_id,
    legal_name: artist.legal_name,
    created_at: artist.created_at,
    updated_at: artist.updated_at,
  };

  const memberships = artist.artist_memberships_artist_memberships_group_idToartists || [];
  if ((artist.artist_kind || "solo") === "group") {
    const members = memberships
      .filter((m: any) => m.artists_artist_memberships_member_idToartists)
      .map((m: any) => ({
        id: m.artists_artist_memberships_member_idToartists.id,
        name: m.artists_artist_memberships_member_idToartists.name,
        role: m.role,
      }));
    data.members = members;
    data.member_count = members.length;
  } else {
    data.members = null;
    data.member_count = 0;
  }
  return data;
}

const include = {
  artist_memberships_artist_memberships_group_idToartists: {
    include: { artists_artist_memberships_member_idToartists: true },
  },
};

export async function GET(req: Request, { params }: { params: Promise<{ artist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { artist_id } = await params;
    const id = parseInt(artist_id);
    const orgId = (session.user as any).organization_id;

    const artist = await prisma.artists.findFirst({
      where: { id, organization_id: orgId },
      include,
    });
    if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

    return NextResponse.json(serializeArtist(artist));
  } catch (err: any) {
    console.error("[GET /api/artists/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ artist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { artist_id } = await params;
    const id = parseInt(artist_id);
    const body = await req.json();
    const { member_ids, ...updateData } = body;

    const existing = await prisma.artists.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

    if (updateData.name && updateData.name !== existing.name) {
      const dup = await prisma.artists.findFirst({ where: { name: updateData.name } });
      if (dup) {
        return NextResponse.json(
          { error: `An artist with the name '${updateData.name}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.artists.update({ where: { id }, data: updateData, include });

    if (member_ids !== undefined && (updated.artist_kind || "solo") === "group") {
      await prisma.artist_memberships.deleteMany({ where: { group_id: id } });
      for (const mid of member_ids) {
        await prisma.artist_memberships.create({
          data: { group_id: id, member_id: mid },
        });
      }
    }

    const full = await prisma.artists.findUnique({ where: { id }, include });
    return NextResponse.json(serializeArtist(full!));
  } catch (err: any) {
    console.error("[PUT /api/artists/[id]]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This artist name or ID might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ artist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { artist_id } = await params;
    const id = parseInt(artist_id);

    const existing = await prisma.artists.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

    await prisma.artists.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/artists/[id]]", err);
    if (err.code === "P2003" || err.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete artist because they are linked to releases, tracks, or contracts." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
