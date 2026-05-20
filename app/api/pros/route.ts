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

    const pros = await prisma.pros.findMany({ skip, take: limit, orderBy: { name: "asc" } });
    return NextResponse.json(pros);
  } catch (err: any) {
    console.error("[GET /api/pros]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const existing = await prisma.pros.findFirst({ where: { name: body.name } });
    if (existing) {
      return NextResponse.json(
        { error: `A PRO with the name '${body.name}' already exists.` },
        { status: 409 }
      );
    }

    const newPro = await prisma.pros.create({ data: body });
    return NextResponse.json(newPro, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/pros]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This PRO name or ID might already exist." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
