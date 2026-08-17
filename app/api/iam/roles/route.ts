import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { requirePermission, clearPermissionCache } from "@/lib/iam";
import { recordAudit } from "@/lib/audit";
import { requireOrganization } from "@/lib/auth/organization-context";
import { isPlatformAuthority } from "@/lib/auth/privilege-authorization";

function platformOf(user: { is_superuser?: boolean; role?: string | null; permissions?: string[] }): boolean {
  return isPlatformAuthority({
    isSuperAdmin: !!user.is_superuser,
    roles: user.role ? [user.role] : [],
    permissions: user.permissions || [],
  });
}

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platform = platformOf(session.user);

  // F3: organization roles visible only within the actor's organization;
  // system/platform roles remain protected (global reference, platform view only).
  const organizationId = platform ? null : (await requireOrganization()).organizationId;
  const where = platform ? {} : { organization_id: organizationId };

  const roles = await prisma.roles.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      role_permissions: {
        include: { permissions: true },
      },
      _count: {
        select: {
          user_roles: platform
            ? true
            : { where: { users: { organization_id: organizationId } } },
        },
      } as any,
    },
  });
  return NextResponse.json(roles);
}

export async function POST(req: Request) {
  const { user, error } = await requirePermission("roles.manage");
  if (error) return error;

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Role name required" }, { status: 400 });

  const platform = platformOf(user as any);
  // F3: client organization override is ignored for org actors — the org is
  // always derived from the session (platform authority may target any org).
  const organization_id =
    platform && body.organization_id
      ? body.organization_id
      : (user as any).organization_id;
  if (!organization_id) {
    return NextResponse.json({ error: "Organization context required" }, { status: 403 });
  }

  // R4: role-name existence pre-check is org-scoped — never a global oracle.
  // Org actors may only collide with a role in their own org or a system role
  // (organization_id null, is_system true); a name held by a foreign org does
  // not block creation at the authorization layer. Platform authority retains
  // the global check (cross-org / platform naming authority). The schema-level
  // global roles.name @unique remains an intentional platform naming
  // constraint (documented in the R4–R7 Step 1 audit §5 F-R4).
  const existing = platform
    ? await prisma.roles.findUnique({ where: { name: body.name } })
    : await prisma.roles.findFirst({
        where: {
          name: body.name,
          OR: [
            { organization_id },
            { organization_id: null, is_system: true },
          ],
        },
      });
  if (existing) return NextResponse.json({ error: "Role already exists" }, { status: 400 });

  const role = await prisma.roles.create({
    data: {
      name: body.name,
      description: body.description || null,
      is_system: false,
      organization_id,
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

  const platform = platformOf(user as any);
  // F3: non-platform actors may only mutate roles bound to their organization
  // (404 keeps foreign/existing roles indistinguishable).
  const role = platform
    ? await prisma.roles.findUnique({ where: { id: body.id } })
    : await prisma.roles.findFirst({
        where: { id: body.id, organization_id: (user as any).organization_id },
      });
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

  const platform = platformOf(user as any);
  const role = platform
    ? await prisma.roles.findUnique({ where: { id } })
    : await prisma.roles.findFirst({
        where: { id, organization_id: (user as any).organization_id },
      });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role.is_system) return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 });

  await prisma.roles.delete({ where: { id } });
  clearPermissionCache();
  recordAudit({ action: "role.deleted", entity_type: "role", entity_id: id, entity_name: role.name, user_id: parseInt(user.id) });
  return NextResponse.json({ success: true });
}