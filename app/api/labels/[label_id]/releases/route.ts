import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/labels/[label_id]/releases */
export async function GET(req: Request, { params }: { params: Promise<{ label_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { label_id } = await params;
    const id = parseInt(label_id);

    const releases = await prisma.releases.findMany({
      where: { label_id: id, is_deleted: false },
    });
    return NextResponse.json(releases);
  } catch (err: any) {
    console.error("[GET /api/labels/[id]/releases]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
