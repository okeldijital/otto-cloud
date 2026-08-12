import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { platformAuthorityFromSession } from "@/lib/auth/privilege-authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!platformAuthorityFromSession(session.user)) {
      return NextResponse.json(
        { error: "Platform authority required", code: "PLATFORM_AUTHORITY_REQUIRED" },
        { status: 403 }
      );
    }

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
    });
  } catch (err: unknown) {
    console.error("[GET /api/network/health]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}