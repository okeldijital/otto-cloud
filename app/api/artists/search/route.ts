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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const types = searchParams.get("types") || "solo,group";
    const limit = parseInt(searchParams.get("limit") || "20");
    const orgId = (session.user as any).organization_id;

    if (!q) return NextResponse.json([]);

    const kinds = types.split(",").map((s) => s.trim());
    const shouldFilterSolo = kinds.includes("solo");
    const shouldFilterGroup = kinds.includes("group");

    const kindFilter =
      shouldFilterSolo && !shouldFilterGroup
        ? { artist_kind: "solo" }
        : shouldFilterGroup && !shouldFilterSolo
        ? { artist_kind: "group" }
        : {};

    const artists = await prisma.artists.findMany({
      where: {
        organization_id: orgId,
        ...kindFilter,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { aka: { contains: q, mode: "insensitive" } },
        ],
      },
      take: limit,
      include: {
        artist_memberships_artist_memberships_group_idToartists: {
          include: { artists_artist_memberships_member_idToartists: true },
        },
      },
    });

    return NextResponse.json(artists.map(serializeArtist));
  } catch (err: any) {
    console.error("[GET /api/artists/search]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
