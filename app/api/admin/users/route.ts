import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      is_active: true,
      is_superuser: true,
      role: true,
      organization_id: true,
      createdAt: true,
      last_login: true,
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(users);
}

export async function PUT(req: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, is_active, is_superuser, role } = body;
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  const updateData: any = {};
  if (is_active !== undefined) updateData.is_active = is_active;
  if (is_superuser !== undefined) updateData.is_superuser = is_superuser;
  if (role !== undefined) updateData.role = role;

  const updated = await prisma.user.update({
    where: { id: parseInt(id) },
    data: updateData,
    select: { id: true, email: true, name: true, is_active: true, is_superuser: true, role: true, organization_id: true },
  });

  return NextResponse.json(updated);
}
