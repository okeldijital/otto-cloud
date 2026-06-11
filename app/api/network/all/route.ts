import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [orgs, individuals, platforms] = await Promise.all([
      prisma.organizations.findMany({ orderBy: { name: "asc" } }),
      prisma.individuals.findMany({
        orderBy: [{ last_name: "asc" }, { first_name: "asc" }],
        include: {
          individual_organizations: {
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
    console.error("[GET /api/network/all]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
