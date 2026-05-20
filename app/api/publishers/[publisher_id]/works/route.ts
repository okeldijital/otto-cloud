import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/publishers/[publisher_id]/works */
export async function GET(req: Request, { params }: { params: Promise<{ publisher_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { publisher_id } = await params;
    const id = parseInt(publisher_id);

    const works = await prisma.works.findMany({ where: { publisher_id: id, is_deleted: false } });
    return NextResponse.json(works);
  } catch (err: any) {
    console.error("[GET /api/publishers/[id]/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
