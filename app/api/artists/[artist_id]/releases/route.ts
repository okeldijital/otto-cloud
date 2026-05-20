import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/artists/[artist_id]/releases */
export async function GET(req: Request, { params }: { params: Promise<{ artist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { artist_id } = await params;
    const id = parseInt(artist_id);

    // Fetch releases where artist_id matches OR artist_ids JSON contains the id
    const releases = await prisma.releases.findMany({
      where: {
        OR: [
          { artist_id: id },
          // Prisma JSON filtering: check if the JSON array contains this id
          { artist_ids: { array_contains: id } },
        ],
        is_deleted: false,
      },
    });

    return NextResponse.json(releases);
  } catch (err: any) {
    console.error("[GET /api/artists/[id]/releases]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
