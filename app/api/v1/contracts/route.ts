import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "../helpers";

export async function GET(req: NextRequest) {
  return withApiAuth(req, "contracts:read", async (orgId) => {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");

    const filter: any = { organization_id: orgId };
    if (status) filter.status = status;

    const data = await prisma.contracts.findMany({
      where: filter,
      take: limit,
      skip: offset,
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { contract_parties: true, contract_documents: true } },
      },
    });

    const total = await prisma.contracts.count({ where: filter });

    return NextResponse.json({ data, total, limit, offset });
  });
}
