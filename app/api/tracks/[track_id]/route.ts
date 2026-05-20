import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ track_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { track_id } = await params;
    const id = parseInt(track_id);

    const track = await prisma.tracks.findUnique({
      where: { id },
      include: { track_releases: true },
    });
    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    return NextResponse.json({
      ...track,
      secondary_release_ids: track.track_releases.map((tr) => tr.release_id),
    });
  } catch (err: any) {
    console.error("[GET /api/tracks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ track_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { track_id } = await params;
    const id = parseInt(track_id);
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
    console.error("[PUT /api/tracks/[id]]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This track title or ISRC might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ track_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { track_id } = await params;
    const id = parseInt(track_id);

    const existing = await prisma.tracks.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    // Clean up relations first
    await prisma.track_releases.deleteMany({ where: { track_id: id } });
    await prisma.tracks.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/tracks/[id]]", err);
    return NextResponse.json({ error: `Could not delete track: ${err.message}` }, { status: 400 });
  }
}
