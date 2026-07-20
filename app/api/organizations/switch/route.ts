import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateMembership } from "@/lib/auth/organization-context";
import {
  getLegacyCatalogScopeId,
  resolveCatalogOrganizationId,
} from "@/lib/auth/migration-compat";

/**
 * Switch active organization for the authenticated user.
 * Updates membership default, user row (tenant_id + organization_id),
 * and returns claims for the client to pass to session.update().
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt((session.user as any).id);
  if (isNaN(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { tenant_id } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const allowed = await validateMembership(userId, tenant_id);
    if (!allowed) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    const membership = await prisma.tenant_users.findUnique({
      where: { tenant_id_user_id: { tenant_id, user_id: userId } },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    await prisma.tenant_users.updateMany({
      where: { user_id: userId },
      data: { is_default: false },
    });

    await prisma.tenant_users.update({
      where: { id: membership.id },
      data: { is_default: true },
    });

    // Catalog scope: preserve legacy visibility if user still on import UUID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organization_id: true },
    });

    let organizationId = resolveCatalogOrganizationId(tenant_id);
    if (user?.organization_id === getLegacyCatalogScopeId()) {
      organizationId = getLegacyCatalogScopeId();
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        tenant_id,
        organization_id: organizationId,
      },
    });

    return NextResponse.json({
      success: true,
      tenant_id,
      organization_id: organizationId,
      // camelCase for session.update()
      tenantId: tenant_id,
      organizationId,
    });
  } catch (error: any) {
    console.error("Error switching organization:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
