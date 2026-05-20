import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/tracks/search?q=&limit= */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
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
  } catch (err: any) {
    console.error("[GET /api/tracks/search]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
