import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { requireOrganization } from "@/lib/auth/organization-context";
import {
  requireLegacyIntOrgId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();
    const intOrg = requireLegacyIntOrgId(ctx);

    const [orgs, individuals, platforms] = await Promise.all([
      prisma.organizations.findMany({
        where: { organization_id: intOrg },
        orderBy: { name: "asc" },
      }),
      prisma.individuals.findMany({
        where: { organization_id: intOrg },
        orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
        include: {
          individual_organizations: {
            where: { organizations: { organization_id: intOrg } },
            include: { organizations: true },
          },
        },
      }),
      prisma.platforms.findMany({ orderBy: { name: "asc" } }),
    ]);

    const result: any[] = [];

    for (const o of orgs) {
      result.push({ ...o, item_type: "Organization" });
    }
    for (const i of individuals) {
      const orgNames = i.individual_organizations
        ?.map((io: any) => io.organizations?.name)
        .filter(Boolean) || [];
      result.push({
        ...i,
        item_type: "Individual",
        organization_names: orgNames,
      });
    }
    for (const p of platforms) {
      result.push({ ...p, item_type: "Platform" });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/network/all]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
