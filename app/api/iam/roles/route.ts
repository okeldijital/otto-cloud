import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, clearPermissionCache } from "@/lib/iam";
import { recordAudit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = await prisma.roles.findMany({
    orderBy: { name: "asc" },
    include: {
      role_permissions: {
        include: { permissions: true },
      },
      _count: { select: { user_roles: true } },
    },
  });
  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const { user, error } = await requirePermission("roles.manage");
  if (error) return error;

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Role name required" }, { status: 400 });

  const existing = await prisma.roles.findUnique({ where: { name: body.name } });
  if (existing) return NextResponse.json({ error: "Role already exists" }, { status: 400 });

  const role = await prisma.roles.create({
    data: {
      name: body.name,
      description: body.description || null,
      is_system: false,
      organization_id: body.organization_id || null,
    },
  });

  if (body.permission_ids?.length) {
    await prisma.role_permissions.createMany({
      data: body.permission_ids.map((pid: number) => ({ role_id: role.id, permission_id: pid })),
      skipDuplicates: true,
    });
  }

  clearPermissionCache();
  recordAudit({ action: "role.created", entity_type: "role", entity_id: role.id, entity_name: role.name, user_id: parseInt(user.id) });

  const full = await prisma.roles.findUnique({
    where: { id: role.id },
    include: { role_permissions: { include: { permissions: true } }, _count: { select: { user_roles: true } } },
  });
  return NextResponse.json(full, { status: 201 });
}

export async function PUT(req: Request) {
  const { user, error } = await requirePermission("roles.manage");
  if (error) return error;

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Role ID required" }, { status: 400 });

  const role = await prisma.roles.findUnique({ where: { id: body.id } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.is_system) return NextResponse.json({ error: "Cannot modify system role" }, { status: 400 });

  await prisma.roles.update({
    where: { id: body.id },
    data: { name: body.name, description: body.description },
  });

  if (body.permission_ids) {
    await prisma.role_permissions.deleteMany({ where: { role_id: body.id } });
    if (body.permission_ids.length) {
      await prisma.role_permissions.createMany({
        data: body.permission_ids.map((pid: number) => ({ role_id: body.id, permission_id: pid })),
      });
    }
  }

  clearPermissionCache();
  recordAudit({ action: "role.updated", entity_type: "role", entity_id: role.id, entity_name: role.name, user_id: parseInt(user.id) });

  const updated = await prisma.roles.findUnique({
    where: { id: body.id },
    include: { role_permissions: { include: { permissions: true } }, _count: { select: { user_roles: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { user, error } = await requirePermission("roles.manage");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "Role ID required" }, { status: 400 });

  const role = await prisma.roles.findUnique({ where: { id } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.is_system) return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 });

  await prisma.roles.delete({ where: { id } });
  clearPermissionCache();
  recordAudit({ action: "role.deleted", entity_type: "role", entity_id: id, entity_name: role.name, user_id: parseInt(user.id) });
  return NextResponse.json({ success: true });
}
