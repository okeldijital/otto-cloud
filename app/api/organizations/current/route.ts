import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const org = await prisma.tenants.findUnique({
    where: { id: tenantId },
    include: {
      _count: { select: { tenant_users: true } },
      subscriptions: { include: { plans: true } },
    },
  });

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json(org);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  try {
    const body = await req.json();

    const allowedFields = [
      "name", "display_name", "legal_name", "org_type",
      "website", "email", "phone", "physical_address",
      "country", "province_state", "city",
      "currency", "timezone", "tax_number", "registration_number",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const org = await prisma.tenants.update({
      where: { id: tenantId },
      data: updateData,
    });

    return NextResponse.json(org);
  } catch (error: any) {
    console.error("Error updating organization:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
