import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "../helpers";

/**
 * API-key royalties feed — always scoped to the key's organization.
 * Royalties lack organization_id; scope via tenant_id or linked artist/work/track.
 */
export async function GET(req: NextRequest) {
  return withApiAuth(req, "royalties:read", async (orgId) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const source = searchParams.get("source");

    const orgScope = {
      OR: [
        { tenant_id: orgId },
        { artists: { is: { organization_id: orgId } } },
        { works: { is: { organization_id: orgId } } },
        {
          tracks: {
            is: {
              OR: [
                { tenant_id: orgId },
                { releases: { is: { organization_id: orgId } } },
                { works: { is: { organization_id: orgId } } },
              ],
            },
          },
        },
      ],
    };

    const filter: any = { AND: [orgScope] };
    if (source) filter.AND.push({ source });

    const data = await prisma.royalties.findMany({
      where: filter,
      take: limit,
      skip: offset,
      orderBy: { statement_date: "desc" },
    });

    const total = await prisma.royalties.count({ where: filter });

    const summary = await prisma.royalties.groupBy({
      by: ["source"],
      where: filter,
      _sum: { amount: true },
      _count: { amount: true },
    });

    return NextResponse.json({ data, total, limit, offset, summary });
  });
}
