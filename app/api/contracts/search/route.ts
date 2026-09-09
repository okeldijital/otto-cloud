import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20"), 1), 50);
    const where: any = { organization_id: ctx.legacyIntOrgId };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { contract_number: { contains: q, mode: "insensitive" } },
        { type: { contains: q, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.contracts.findMany({
        where,
        take: limit,
        orderBy: { created_at: "desc" },
        select: { id: true, title: true, contract_number: true, type: true, status: true },
      }),
      prisma.contracts.count({ where }),
    ]);
    return NextResponse.json({ total, items });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/contracts/search]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
