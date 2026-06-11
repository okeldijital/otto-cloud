import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const plans = await prisma.plans.findMany({ orderBy: { price: "asc" } });
    return NextResponse.json(plans);
  } catch (err: any) {
    console.error("[GET /api/plans]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
