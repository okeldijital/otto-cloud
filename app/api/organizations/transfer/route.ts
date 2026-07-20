import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ctx = await requireOrganization();

  const tenantId = ctx.tenantId;
  const userId = parseInt((session.user as any).id);
  if (!tenantId || isNaN(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { new_owner_id } = body;

    if (!new_owner_id) {
      return NextResponse.json({ error: "new_owner_id is required" }, { status: 400 });
    }

    const org = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { owner_id: true },
    });

    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    if (org.owner_id !== userId) {
      return NextResponse.json({ error: "Only the organization owner can transfer ownership" }, { status: 403 });
    }

    const newOwner = await prisma.tenant_users.findUnique({
      where: { tenant_id_user_id: { tenant_id: tenantId, user_id: new_owner_id } },
    });

    if (!newOwner) {
      return NextResponse.json({ error: "New owner must be a member of the organization" }, { status: 400 });
    }

    await prisma.tenants.update({
      where: { id: tenantId },
      data: { owner_id: new_owner_id },
    });

    return NextResponse.json({ success: true, message: "Ownership transferred" });
  } catch (error: any) {
    console.error("Error transferring ownership:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
