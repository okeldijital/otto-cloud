import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ release_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { release_id } = await params;
    const id = parseInt(release_id);

    const release = await prisma.releases.findUnique({ where: { id } });
    if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

    // Enrich with status_quo data
    const tracks = await prisma.tracks.findMany({ where: { release_id: id } });
    const trackIds = tracks.map((t) => t.id);

    let hasContract = !!(await prisma.contract_assets.findFirst({
      where: { asset_type: "Release", asset_id: id },
    }));
    if (!hasContract && trackIds.length) {
      hasContract = !!(await prisma.contract_assets.findFirst({
        where: { asset_type: "Track", asset_id: { in: trackIds } },
      }));
    }

    const artistIdList: number[] = [];
    if (release.artist_id) artistIdList.push(release.artist_id);
    if (Array.isArray(release.artist_ids)) artistIdList.push(...(release.artist_ids as number[]));

    const hasArtistContract =
      artistIdList.length > 0
        ? !!(await prisma.contract_parties.findFirst({
            where: { entity_type: "Artist", entity_id: { in: artistIdList } },
          }))
        : false;

    return NextResponse.json({ ...release, _tracks: tracks, _hasContract: hasContract, _hasArtistContract: hasArtistContract });
  } catch (err: any) {
    console.error("[GET /api/releases/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ release_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { release_id } = await params;
    const id = parseInt(release_id);
    const body = await req.json();
    const { track_ids, ...updateData } = body;

    const existing = await prisma.releases.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Release not found" }, { status: 404 });

    if (updateData.title && updateData.title !== existing.title) {
      const dup = await prisma.releases.findFirst({ where: { title: updateData.title } });
      if (dup) {
        return NextResponse.json(
          { error: `A release with the title '${updateData.title}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.releases.update({ where: { id }, data: updateData });

    if (track_ids !== undefined) {
      const currentTracks = await prisma.tracks.findMany({ where: { release_id: id } });
      const currentIds = new Set(currentTracks.map((t) => t.id));
      const newIds = new Set<number>(track_ids);

      // Unassign removed tracks
      const toUnassign = [...currentIds].filter((tid) => !newIds.has(tid));
      if (toUnassign.length) {
        await prisma.tracks.updateMany({ where: { id: { in: toUnassign } }, data: { release_id: null } });
      }

      // Assign new tracks
      const toAssign = [...newIds].filter((tid) => !currentIds.has(tid));
      if (toAssign.length) {
        const tracksToAssign = await prisma.tracks.findMany({ where: { id: { in: toAssign } } });
        await Promise.all(
          tracksToAssign.map((t) =>
            prisma.tracks.update({
              where: { id: t.id },
              data: {
                release_id: id,
                credits: !t.credits && updated.credits ? updated.credits : t.credits,
              },
            })
          )
        );
      }
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/releases/[id]]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This release title, catalog number, or UPC might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ release_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { release_id } = await params;
    const id = parseInt(release_id);

    const existing = await prisma.releases.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Release not found" }, { status: 404 });

    // Unlink tracks first
    await prisma.tracks.updateMany({ where: { release_id: id }, data: { release_id: null } });
    await prisma.releases.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/releases/[id]]", err);
    if (err.code === "P2003" || err.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete release because it is linked to contracts or other strict dependencies." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: `Could not delete release: ${err.message}` }, { status: 400 });
  }
}
