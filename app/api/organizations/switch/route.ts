import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { validateMembership } from "@/lib/auth/organization-context";

/**
 * Switch the active IAM organization for the authenticated identity.
 * Organization membership is authoritative; legacy user/tenant tables are not consulted.
 */
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identityId = session.user.identityId;

  try {
    const body = await req.json();
    const { tenant_id: organizationId } = body;

    if (!organizationId || typeof organizationId !== "string") {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }

    const allowed = await validateMembership(identityId, organizationId);
    if (!allowed) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    await prisma.iamOrganizationMembership.updateMany({
      where: { identityId, status: "active" },
      data: { isDefault: false },
    });

    await prisma.iamOrganizationMembership.updateMany({
      where: { identityId, organizationId, status: "active" },
      data: { isDefault: true },
    });

    return NextResponse.json({
      success: true,
      tenant_id: organizationId,
      organization_id: organizationId,
      tenantId: organizationId,
      organizationId,
    });
  } catch (error) {
    console.error("Error switching organization:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
