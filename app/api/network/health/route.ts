import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import {
  requireLegacyIntOrgId,
  requireActorUserId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgIdStr = ctx.organizationId;
    const orgId = requireLegacyIntOrgId(ctx);

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
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[GET /api/network/health]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
