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
    const orgId = (session.user as any).organization_id;

    const releases = await prisma.releases.findMany({
      where: { organization_id: orgId, is_deleted: false },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });

    // Enrich with status_quo
    const enriched = await Promise.all(
      releases.map(async (r) => {
        const tracks = await prisma.tracks.findMany({ where: { release_id: r.id } });
        const trackIds = tracks.map((t) => t.id);

        let hasContract = !!(await prisma.contract_assets.findFirst({
          where: { asset_type: "Release", asset_id: r.id },
        }));
        if (!hasContract && trackIds.length) {
          hasContract = !!(await prisma.contract_assets.findFirst({
            where: { asset_type: "Track", asset_id: { in: trackIds } },
          }));
        }

        const artistIdList: number[] = [];
        if (r.artist_id) artistIdList.push(r.artist_id);
        if (Array.isArray(r.artist_ids)) artistIdList.push(...(r.artist_ids as number[]));

        const hasArtistContract =
          artistIdList.length > 0
            ? !!(await prisma.contract_parties.findFirst({
                where: { entity_type: "Artist", entity_id: { in: artistIdList } },
              }))
            : false;

        return { ...r, _tracks: tracks, _hasContract: hasContract, _hasArtistContract: hasArtistContract };
      })
    );

    return NextResponse.json(enriched);
  } catch (err: any) {
    console.error("[GET /api/releases]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { track_ids, ...releaseData } = body;

    const existing = await prisma.releases.findFirst({ where: { title: releaseData.title } });
    if (existing) {
      return NextResponse.json(
        { error: `A release with the title '${releaseData.title}' already exists.` },
        { status: 409 }
      );
    }

    const newRelease = await prisma.releases.create({ data: releaseData });

    if (track_ids?.length) {
      const tracksToAssign = await prisma.tracks.findMany({ where: { id: { in: track_ids } } });
      await Promise.all(
        tracksToAssign.map((t) =>
          prisma.tracks.update({
            where: { id: t.id },
            data: {
              release_id: newRelease.id,
              credits: !t.credits && newRelease.credits ? newRelease.credits : t.credits,
            },
          })
        )
      );
    }

    return NextResponse.json(newRelease, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/releases]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A release with this Title, Catalog Number, or UPC already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
