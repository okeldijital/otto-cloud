import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt((session.user as any).id);
  if (isNaN(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.tenant_users.findMany({
    where: { user_id: userId },
    include: {
      tenants: {
        select: {
          id: true,
          name: true,
          display_name: true,
          logo_url: true,
          brand_color: true,
          org_type: true,
          is_active: true,
          owner_id: true,
        },
      },
    },
    orderBy: { invited_at: "desc" },
  });

  const orgs = memberships.map(m => ({
    id: m.tenants.id,
    name: m.tenants.name,
    display_name: m.tenants.display_name,
    logo_url: m.tenants.logo_url,
    brand_color: m.tenants.brand_color,
    org_type: m.tenants.org_type,
    is_active: m.tenants.is_active,
    is_owner: m.tenants.owner_id === userId,
    is_default: m.is_default,
    role_id: m.role_id,
  }));

  return NextResponse.json(orgs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt((session.user as any).id);
  if (isNaN(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { name, org_type } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 });
    }

    const tenantId = uuidv4();

    const tenant = await prisma.tenants.create({
      data: {
        id: tenantId,
        name: name.trim(),
        display_name: body.display_name || null,
        org_type: org_type || "record_label",
        owner_id: userId,
        is_active: true,
      },
    });

    await prisma.tenant_users.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        is_default: true,
        invited_at: new Date(),
        accepted_at: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { tenant_id: tenantId },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error: any) {
    console.error("Error creating organization:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
