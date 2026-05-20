import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/labels/[label_id]/artists */
export async function GET(req: Request, { params }: { params: Promise<{ label_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { label_id } = await params;
    const id = parseInt(label_id);

    const artists = await prisma.artists.findMany({ where: { label_id: id } });
    return NextResponse.json(artists);
  } catch (err: any) {
    console.error("[GET /api/labels/[id]/artists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
