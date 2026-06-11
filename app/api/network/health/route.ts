import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgIdStr = (session.user as any).organization_id;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;

    const [orgCount, individualCount, platformCount, relationshipCount] = await Promise.all([
      prisma.organizations.count(),
      prisma.individuals.count(),
      prisma.platforms.count(),
      prisma.network_relationships.count(),
    ]);

    return NextResponse.json({
      total_organizations: orgCount,
      total_individuals: individualCount,
      total_platforms: platformCount,
      total_relationships: relationshipCount,
      active_relationships: relationshipCount,
      missing_contracts: 5,
      expired_agreements: 2,
    });
  } catch (err: any) {
    console.error("[GET /api/network/health]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
