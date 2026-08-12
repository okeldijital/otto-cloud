/**
 * GET / PUT /api/admin/users
 * A.8 Group B: org admins cannot set is_superuser; platform authority required.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requirePlatformAdmin } from "@/lib/permissions";
import { getServerSession } from "@/lib/auth/session";
import { requireOrganization } from "@/lib/auth/organization-context";
import {
  assertCanSetSuperuser,
  isPlatformAuthority,
} from "@/lib/auth/privilege-authorization";

export async function GET() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  // Platform authority: all users. Org admin: same organization only.
  const session = await getServerSession();
  const platform = isPlatformAuthority({
    isSuperAdmin: !!user.is_superuser,
    permissions: user.permissions,
    roles: user.role ? [user.role] : [],
  });

  if (platform) {
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

  try {
    const ctx = await requireOrganization(session);
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { organization_id: ctx.organizationId },
          { tenant_id: ctx.organizationId },
        ],
      },
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
  } catch {
    return NextResponse.json(
      { error: "Organization context required" },
      { status: 403 }
    );
  }
}

export async function PUT(req: Request) {
  const { user: actor, error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { id, is_active, is_superuser, role } = body;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const targetId = parseInt(String(id), 10);
  if (!Number.isFinite(targetId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const platform = isPlatformAuthority({
    isSuperAdmin: !!actor.is_superuser,
    permissions: actor.permissions,
    roles: actor.role ? [actor.role] : [],
  });

  // is_superuser: only platform authority; reject unauthorized attempts
  let superuserValue: boolean | undefined;
  if (is_superuser !== undefined) {
    if (!platform) {
      return NextResponse.json(
        {
          error: "Platform authority required to modify superuser status",
          code: "PLATFORM_AUTHORITY_REQUIRED",
        },
        { status: 403 }
      );
    }
    // Double-check via helper (throws if invalid type)
    superuserValue = assertCanSetSuperuser(
      {
        isSuperAdmin: true,
        permissions: actor.permissions,
        roles: actor.role ? [actor.role] : [],
      },
      is_superuser
    );
  }

  // Org admins may only mutate users in their organization
  if (!platform) {
    const session = await getServerSession();
    try {
      const ctx = await requireOrganization(session);
      const target = await prisma.user.findUnique({
        where: { id: targetId },
        select: { organization_id: true, tenant_id: true },
      });
      if (!target) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const inOrg =
        target.organization_id === ctx.organizationId ||
        target.tenant_id === ctx.organizationId;
      if (!inOrg) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    } catch {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 403 }
      );
    }
  }

  const updateData: Record<string, unknown> = {};
  if (is_active !== undefined) updateData.is_active = Boolean(is_active);
  if (superuserValue !== undefined) updateData.is_superuser = superuserValue;
  if (role !== undefined) {
    if (typeof role !== "string") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    const r = role.trim().toLowerCase();
    if (r === "super_admin" || r === "platform_admin" || r === "superuser") {
      if (!platform) {
        return NextResponse.json(
          { error: "Cannot assign platform roles" },
          { status: 403 }
        );
      }
    }
    updateData.role = role;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Superuser field also requires platform path was taken
  if ("is_superuser" in updateData && !platform) {
    return NextResponse.json(
      { error: "Platform authority required" },
      { status: 403 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      is_active: true,
      is_superuser: true,
      role: true,
      organization_id: true,
    },
  });

  return NextResponse.json(updated);
}
