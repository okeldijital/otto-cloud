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

    const publishers = await prisma.publishers.findMany({ skip, take: limit, orderBy: { name: "asc" } });
    return NextResponse.json(publishers);
  } catch (err: any) {
    console.error("[GET /api/publishers]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const existing = await prisma.publishers.findFirst({ where: { name: body.name } });
    if (existing) {
      return NextResponse.json(
        { error: `A publisher with the name '${body.name}' already exists.` },
        { status: 409 }
      );
    }

    const newPublisher = await prisma.publishers.create({ data: body });
    return NextResponse.json(newPublisher, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/publishers]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This publisher name or ID might already exist." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
