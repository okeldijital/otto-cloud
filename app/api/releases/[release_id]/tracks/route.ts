import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/releases/[release_id]/tracks */
export async function GET(req: Request, { params }: { params: Promise<{ release_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { release_id } = await params;
    const id = parseInt(release_id);

    const tracks = await prisma.tracks.findMany({
      where: { release_id: id },
      include: { track_releases: true },
    });

    return NextResponse.json(
      tracks.map((t) => ({
        ...t,
        secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
      }))
    );
  } catch (err: any) {
    console.error("[GET /api/releases/[id]/tracks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
