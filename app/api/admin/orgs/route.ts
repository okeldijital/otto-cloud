import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const orgs = await prisma.organizations.findMany({
    orderBy: { name: "asc" },
  });

  const data = orgs.map((org) => ({
    id: org.id,
    name: org.name,
    display_name: org.display_name,
    org_type: org.org_type,
    website: org.website,
    logo_url: org.logo_url,
    brand_color: org.brand_color,
    organization_id: org.organization_id,
    created_at: org.created_at,
  }));

  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, name, display_name, logo_url, brand_color, website } = body;

  if (!id) return NextResponse.json({ error: "Missing organization id" }, { status: 400 });

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (display_name !== undefined) updateData.display_name = display_name;
  if (logo_url !== undefined) updateData.logo_url = logo_url;
  if (brand_color !== undefined) updateData.brand_color = brand_color;
  if (website !== undefined) updateData.website = website;

  const updated = await prisma.organizations.update({
    where: { id: parseInt(id) },
    data: updateData,
  });

  return NextResponse.json(updated);
}
