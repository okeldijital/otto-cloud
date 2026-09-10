import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { organizationService } from "@/lib/platform/sdk";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const identityId = session.user.identityId;
  if (!identityId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      display_name: string | null;
      logo_url: string | null;
      brand_color: string | null;
      org_type: string | null;
      is_active: string;
      is_owner: boolean;
      is_default: boolean;
      role_id: string | null;
      role_key: string | null;
      role_name: string | null;
    }>
  >(Prisma.sql`
    SELECT
      o.id::text AS id,
      o.name,
      t.display_name,
      t.logo_url,
      t.brand_color,
      t.org_type,
      o.status AS is_active,
      m."isOwner" AS is_owner,
      m."isDefault" AS is_default,
      m."roleId"::text AS role_id,
      r.key AS role_key,
      r.name AS role_name
    FROM iam_organization_memberships m
    INNER JOIN iam_identities i ON i.id = m."identityId"
    INNER JOIN iam_organizations o ON o.id = m."organizationId"
    LEFT JOIN iam_roles r ON r.id = m."roleId"
    LEFT JOIN tenants t ON t.id = o."legacyTenantId"
    WHERE i.id = ${identityId}
      AND m.status = 'active'
      AND o.status = 'active'
    ORDER BY m."isDefault" DESC, m."isOwner" DESC, o.name ASC
  `);

  const orgs = memberships.map(m => ({
    id: m.id,
    name: m.name,
    display_name: m.display_name ?? m.name,
    logo_url: m.logo_url,
    brand_color: m.brand_color,
    org_type: m.org_type,
    is_active: m.is_active === "active",
    is_owner: m.is_owner,
    is_default: m.is_default,
    role_id: m.role_id,
    role_key: m.role_key,
    role_name: m.role_name,
  }));

  return NextResponse.json(orgs);
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const creatorIdentityId = session.user.identityId;
  if (!creatorIdentityId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim() : undefined;

    if (!name) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    // OrganizationService is the canonical IAM boundary. Do not create a
    // legacy tenants/tenant_users record here; legacy tenant linkage is an
    // explicit compatibility concern and is intentionally omitted for new orgs.
    const organization = await organizationService.createOrganization({
      name,
      slug,
      creatorIdentityId,
    });

    return NextResponse.json(
      {
        ...organization,
        organization_id: organization.id,
        organizationId: organization.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating organization:", error);
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    return NextResponse.json(
      { error: status === 500 ? "Internal Server Error" : error?.message || "Organization creation failed" },
      { status }
    );
  }
}
