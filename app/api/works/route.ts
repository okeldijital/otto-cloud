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

    const works = await prisma.works.findMany({
      where: { organization_id: orgId, is_deleted: false },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(works);
  } catch (err: any) {
    console.error("[GET /api/works]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const orgId = (session.user as any).organization_id;

    const existing = await prisma.works.findFirst({ where: { title: body.title } });
    if (existing) {
      return NextResponse.json(
        { error: `A musical work with the title '${body.title}' already exists.` },
        { status: 409 }
      );
    }

    const newWork = await prisma.works.create({
      data: { ...body, organization_id: orgId },
    });

    return NextResponse.json(newWork, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/works]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This work title or ID might already exist." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
