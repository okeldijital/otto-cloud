import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/tracks/by_ids  body: { ids: number[] } */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const ids: number[] = body.ids || [];
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
  } catch (err: any) {
    console.error("[POST /api/tracks/by_ids]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
