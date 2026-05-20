import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/artists/[artist_id]/works */
export async function GET(req: Request, { params }: { params: Promise<{ artist_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { artist_id } = await params;
    const id = parseInt(artist_id);

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
  } catch (err: any) {
    console.error("[GET /api/artists/[id]/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
