import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/publishers/[publisher_id]/artists */
export async function GET(req: Request, { params }: { params: Promise<{ publisher_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { publisher_id } = await params;
    const id = parseInt(publisher_id);

    const artists = await prisma.artists.findMany({ where: { publisher_id: id } });
    return NextResponse.json(artists);
  } catch (err: any) {
    console.error("[GET /api/publishers/[id]/artists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
