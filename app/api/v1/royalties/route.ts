import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "../helpers";

export async function GET(req: NextRequest) {
  return withApiAuth(req, "royalties:read", async (orgId) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const source = searchParams.get("source");

    const filter: any = {};
    if (source) filter.source = source;

    const data = await prisma.royalties.findMany({
      where: filter,
      take: limit,
      skip: offset,
      orderBy: { statement_date: "desc" },
    });

    const total = await prisma.royalties.count({ where: filter });

    const summary = await prisma.royalties.groupBy({
      by: ["source"],
      _sum: { amount: true },
      _count: { amount: true },
    });

    return NextResponse.json({ data, total, limit, offset, summary });
  });
}
