import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const includeMemberships = {
  artist_memberships_artist_memberships_group_idToartists: {
    include: {
      artists_artist_memberships_member_idToartists: true,
    },
  },
};

function serializeArtist(artist: any) {
  if (!artist) return null;
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
    const orgId = (session.user as any).organization_id;

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const relation = searchParams.get("relation");

      if (relation === "releases") {
        const releases = await prisma.releases.findMany({
          where: {
            OR: [
              { artist_id: id },
              { artist_ids: { array_contains: id } },
            ],
            is_deleted: false,
          },
        });
        return NextResponse.json(releases);
      }

      if (relation === "works") {
        const works = await prisma.works.findMany({
          where: {
            is_deleted: false,
            OR: [
              { composers: { array_contains: id } },
              { arrangers: { array_contains: id } },
            ],
          },
        });
        return NextResponse.json(works);
      }

      if (relation === "members") {
        const memberships = await prisma.artist_memberships.findMany({
          where: { group_id: id },
          include: { artists_artist_memberships_member_idToartists: true },
        });
        const members = memberships
          .filter((m: any) => m.artists_artist_memberships_member_idToartists)
          .map((m: any) => ({
            id: m.artists_artist_memberships_member_idToartists.id,
            name: m.artists_artist_memberships_member_idToartists.name,
            role: m.role,
          }));
        return NextResponse.json(members);
      }

      const artist = await prisma.artists.findFirst({
        where: { id, organization_id: orgId },
        include: includeMemberships,
      });
      if (!artist) return NextResponse.json({ error: "Artist not found" }, { status: 404 });
      return NextResponse.json(serializeArtist(artist));
    }

    const q = (searchParams.get("q") || searchParams.get("search") || "").trim();
    if (q) {
      const types = searchParams.get("types") || "solo,group";
      const limit = parseInt(searchParams.get("limit") || "20");

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
        include: includeMemberships,
      });

      return NextResponse.json(artists.map(serializeArtist));
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const kind = searchParams.get("kind");

    const where: any = { organization_id: orgId };
    if (kind) where.artist_kind = kind.toLowerCase();

    const artists = await prisma.artists.findMany({
      where,
      skip,
      take: limit,
      include: includeMemberships,
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

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const orgId = (session.user as any).organization_id;

    if (action === "add_member") {
      const body = await req.json();
      const { group_id, member_id, role } = body;
      const membership = await prisma.artist_memberships.create({
        data: {
          group_id: parseInt(group_id),
          member_id: parseInt(member_id),
          role: role || null,
          organization_id: typeof orgId === "string" ? null : orgId,
        },
      });
      return NextResponse.json(membership, { status: 201 });
    }

    const body = await req.json();
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
      include: includeMemberships,
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

    const full = await prisma.artists.findUnique({
      where: { id: newArtist.id },
      include: includeMemberships,
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

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing artist ID" }, { status: 400 });
    const id = parseInt(idStr);

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

    const updated = await prisma.artists.update({ where: { id }, data: updateData, include: includeMemberships });

    if (member_ids !== undefined && (updated.artist_kind || "solo") === "group") {
      await prisma.artist_memberships.deleteMany({ where: { group_id: id } });
      for (const mid of member_ids) {
        await prisma.artist_memberships.create({
          data: { group_id: id, member_id: mid },
        });
      }
    }

    const full = await prisma.artists.findUnique({ where: { id }, include: includeMemberships });
    return NextResponse.json(serializeArtist(full!));
  } catch (err: any) {
    console.error("[PUT /api/artists]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This artist name or ID might already be in use." },
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
    if (!idStr) return NextResponse.json({ error: "Missing artist ID" }, { status: 400 });
    const id = parseInt(idStr);

    const memberIdStr = searchParams.get("memberId");
    if (memberIdStr) {
      const memberId = parseInt(memberIdStr);
      await prisma.artist_memberships.deleteMany({
        where: { group_id: id, member_id: memberId },
      });
      return new NextResponse(null, { status: 204 });
    }

    const existing = await prisma.artists.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Artist not found" }, { status: 404 });

    await prisma.artists.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/artists]", err);
    if (err.code === "P2003" || err.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete artist because they are linked to releases, tracks, or contracts." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
