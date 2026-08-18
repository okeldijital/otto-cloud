import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

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

    const membership = await prisma.iamOrganizationMembership.findFirst({
      where: { identityId, organizationId, status: "active" },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
    }

    await prisma.iamOrganizationMembership.updateMany({
      where: { identityId, status: "active" },
      data: { isDefault: false },
    });

    await prisma.iamOrganizationMembership.update({
      where: { id: membership.id },
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
