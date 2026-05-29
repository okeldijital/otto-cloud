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
      const track = await prisma.tracks.findUnique({
        where: { id },
        include: { track_releases: true },
      });
      if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

      return NextResponse.json({
        ...track,
        secondary_release_ids: track.track_releases.map((tr) => tr.release_id),
      });
    }

    const q = searchParams.get("q") || searchParams.get("query") || "";
    if (q || searchParams.get("search")) {
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = parseInt(searchParams.get("offset") || "0");

      const where: any = q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { isrc_code: { contains: q, mode: "insensitive" } },
            ],
          }
        : {};

      const items = await prisma.tracks.findMany({
        where,
        take: limit,
        skip: offset,
        include: { track_releases: true },
      });

      return NextResponse.json({
        items: items.map((t) => ({
          ...t,
          secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
        })),
        total: items.length,
      });
    }

    const idsStr = searchParams.get("ids");
    if (idsStr) {
      const ids = idsStr.split(",").map((s) => parseInt(s)).filter((n) => !isNaN(n));
      const items = await prisma.tracks.findMany({
        where: { id: { in: ids } },
        include: { track_releases: true },
      });
      return NextResponse.json({
        items: items.map((t) => ({
          ...t,
          secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
        })),
      });
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const tracks = await prisma.tracks.findMany({
      skip,
      take: limit,
      include: { track_releases: true },
    });

    return NextResponse.json(
      tracks.map((t) => ({
        ...t,
        secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
      }))
    );
  } catch (err: any) {
    console.error("[GET /api/tracks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Check if it's the "by_ids" query
    if (Array.isArray(body.ids)) {
      const ids: number[] = body.ids;
      if (!ids.length) return NextResponse.json({ items: [] });

      const items = await prisma.tracks.findMany({
        where: { id: { in: ids } },
        include: { track_releases: true },
      });

      return NextResponse.json({
        items: items.map((t) => ({
          ...t,
          secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
        })),
      });
    }

    const { secondary_release_ids, ...trackData } = body;

    const existing = await prisma.tracks.findFirst({ where: { title: trackData.title } });
    if (existing) {
      return NextResponse.json(
        { error: `A track with the title '${trackData.title}' already exists.` },
        { status: 409 }
      );
    }

    // Auto-assign credits/date/streaming_link from release
    if (trackData.release_id) {
      const release = await prisma.releases.findUnique({ where: { id: trackData.release_id } });
      if (release) {
        if (!trackData.credits && release.credits) trackData.credits = release.credits;
        if (!trackData.release_date && release.release_date) trackData.release_date = release.release_date;
        if (!trackData.streaming_link && (release as any).streaming_link)
          trackData.streaming_link = (release as any).streaming_link;
      }
    }

    const newTrack = await prisma.tracks.create({ data: trackData });

    // Handle secondary releases
    if (secondary_release_ids?.length) {
      await Promise.all(
        secondary_release_ids.map((rid: number) =>
          prisma.track_releases.create({ data: { track_id: newTrack.id, release_id: rid } }).catch(() => null)
        )
      );
    }

    const full = await prisma.tracks.findUnique({
      where: { id: newTrack.id },
      include: { track_releases: true },
    });

    return NextResponse.json(
      { ...full, secondary_release_ids: full?.track_releases.map((tr) => tr.release_id) ?? [] },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/tracks]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A track with this ISRC, Track ID, or Title already exists." },
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
    if (!idStr) return NextResponse.json({ error: "Missing track ID" }, { status: 400 });
    const id = parseInt(idStr);

    const body = await req.json();
    const { secondary_release_ids, ...updateData } = body;

    const existing = await prisma.tracks.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    if (updateData.title && updateData.title !== existing.title) {
      const dup = await prisma.tracks.findFirst({ where: { title: updateData.title } });
      if (dup) {
        return NextResponse.json(
          { error: `A track with the title '${updateData.title}' already exists.` },
          { status: 409 }
        );
      }
    }

    // Auto credits/date/streaming_link when release_id changes
    if (updateData.release_id !== undefined && updateData.release_id !== existing.release_id) {
      if (updateData.release_id) {
        const release = await prisma.releases.findUnique({ where: { id: updateData.release_id } });
        if (release) {
          if (!updateData.credits && !existing.credits && release.credits)
            updateData.credits = release.credits;
          if (!existing.release_date && !updateData.release_date && release.release_date)
            updateData.release_date = release.release_date;
          if ((release as any).streaming_link && !("streaming_link" in updateData))
            updateData.streaming_link = (release as any).streaming_link;
        }
      }
    }

    const updated = await prisma.tracks.update({ where: { id }, data: updateData });

    if (secondary_release_ids !== undefined) {
      await prisma.track_releases.deleteMany({ where: { track_id: id } });
      if (secondary_release_ids.length) {
        await Promise.all(
          secondary_release_ids.map((rid: number) =>
            prisma.track_releases.create({ data: { track_id: id, release_id: rid } }).catch(() => null)
          )
        );
      }
    }

    const full = await prisma.tracks.findUnique({
      where: { id },
      include: { track_releases: true },
    });

    return NextResponse.json({
      ...full,
      secondary_release_ids: full?.track_releases.map((tr) => tr.release_id) ?? [],
    });
  } catch (err: any) {
    console.error("[PUT /api/tracks]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This track title or ISRC might already be in use." },
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
    if (!idStr) return NextResponse.json({ error: "Missing track ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.tracks.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    // Clean up relations first
    await prisma.track_releases.deleteMany({ where: { track_id: id } });
    await prisma.tracks.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/tracks]", err);
    return NextResponse.json({ error: `Could not delete track: ${err.message}` }, { status: 400 });
  }
}
