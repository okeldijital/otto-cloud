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
    const query = searchParams.get("query") || "";
    // Note: tracks table doesn't have organization_id in schema; filter via release if needed
    const where: any = {};
    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { isrc_code: { contains: query, mode: "insensitive" } },
      ];
    }

    const tracks = await prisma.tracks.findMany({
      where,
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
