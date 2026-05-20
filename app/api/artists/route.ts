import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const kind = searchParams.get("kind");
    const orgId = (session.user as any).organization_id;

    const where: any = { organization_id: orgId };
    if (kind) where.artist_kind = kind.toLowerCase();

    const artists = await prisma.artists.findMany({
      where,
      skip,
      take: limit,
      include: {
        artist_memberships_artist_memberships_group_idToartists: {
          include: {
            artists_artist_memberships_member_idToartists: true,
          },
        },
      },
    });

    return NextResponse.json(artists.map(serializeArtist));
  } catch (err: any) {
    console.error("[GET /api/artists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const orgId = (session.user as any).organization_id;

    const existing = await prisma.artists.findFirst({
      where: { name: body.name, organization_id: orgId },
    });
    if (existing) {
      return NextResponse.json(
        { error: `An artist with the name '${body.name}' already exists.` },
        { status: 409 }
      );
    }

    const { member_ids, ...artistData } = body;

    const newArtist = await prisma.artists.create({
      data: { ...artistData, organization_id: orgId },
      include: {
        artist_memberships_artist_memberships_group_idToartists: {
          include: { artists_artist_memberships_member_idToartists: true },
        },
      },
    });

    if (artistData.artist_kind === "group" && member_ids?.length) {
      for (const mid of member_ids) {
        await prisma.artist_memberships.create({
          data: {
            group_id: newArtist.id,
            member_id: mid,
            organization_id: typeof orgId === "string" ? null : orgId,
          },
        });
      }
    }

    // Re-fetch with memberships
    const full = await prisma.artists.findUnique({
      where: { id: newArtist.id },
      include: {
        artist_memberships_artist_memberships_group_idToartists: {
          include: { artists_artist_memberships_member_idToartists: true },
        },
      },
    });

    return NextResponse.json(serializeArtist(full!), { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/artists]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This artist name or ID might already exist." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
