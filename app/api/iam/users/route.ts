/**
 * Legacy IAM users API — A.8 Group B fail-closed hardening.
 *
 * Mutations require users.manage, target must be in the actor's organization
 * (unless platform authority). Password reset is admin-only within org.
 * Arbitrary role assignment to any user is blocked.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/iam";
import { recordAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  assertLegacyUserInActorOrg,
  isPlatformAuthority,
  normalizeLegacyInviteRole,
} from "@/lib/auth/privilege-authorization";
import { IdentityError } from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const tenantId = ctx.tenantId || orgId;
    const action = searchParams.get("action");

    if (action === "detail") {
      const userId = parseInt(searchParams.get("user_id") || "");
      if (!userId) {
        return NextResponse.json({ error: "user_id required" }, { status: 400 });
      }
      // Scope target to actor org
      try {
        await assertLegacyUserInActorOrg(
          {
            identityId: session.user.identityId,
            organizationId: orgId,
            isSuperAdmin: !!session.user.is_superuser,
            permissions: session.user.permissions || [],
            roles: session.user.role ? [session.user.role] : [],
            tenantId: ctx.tenantId,
          } as any,
          userId
        );
      } catch (e: any) {
        if (e instanceof IdentityError) {
          return NextResponse.json(
            { error: e.message, code: e.code },
            { status: e.status }
          );
        }
        throw e;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          is_active: true,
          is_superuser: true,
          role: true,
          department: true,
          last_login: true,
          createdAt: true,
          organization_id: true,
        },
      });
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const roles = await prisma.user_roles.findMany({
        where: { user_id: userId },
        include: { roles: true },
      });
      const teams = await prisma.team_members.findMany({
        where: { user_id: userId },
        include: { teams: true },
      });
      return NextResponse.json({
        user,
        roles: roles.map((r) => r.roles),
        teams: teams.map((t) => t.teams),
      });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [{ tenant_id: tenantId }, { organization_id: orgId }],
      },
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true,
        is_superuser: true,
        role: true,
        department: true,
        last_login: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    });

    const userIds = users.map((u) => u.id);
    const [allRoles, allTeams] = await Promise.all([
      prisma.user_roles.findMany({
        where: { user_id: { in: userIds } },
        include: { roles: true },
      }),
      prisma.team_members.findMany({
        where: { user_id: { in: userIds } },
        include: { teams: true },
      }),
    ]);
    const rolesByUser: Record<number, any[]> = {};
    const teamsByUser: Record<number, any[]> = {};
    for (const ur of allRoles) {
      if (!rolesByUser[ur.user_id]) rolesByUser[ur.user_id] = [];
      rolesByUser[ur.user_id].push(ur.roles);
    }
    for (const tm of allTeams) {
      if (!teamsByUser[tm.user_id]) teamsByUser[tm.user_id] = [];
      teamsByUser[tm.user_id].push(tm.teams);
    }

    return NextResponse.json(
      users.map((u) => ({
        ...u,
        roles: rolesByUser[u.id] || [],
        teams: teamsByUser[u.id] || [],
      }))
    );
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/iam/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { user: actor, error } = await requirePermission("users.manage");
  if (error) return error;

  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orgCtx;
  try {
    orgCtx = await requireOrganization(session);
  } catch {
    return NextResponse.json(
      { error: "Organization context required" },
      { status: 403 }
    );
  }

  const actorCtx = {
    identityId: String(session.user.identityId || session.user.id || ""),
    email: session.user.email || "",
    displayName: session.user.name ?? null,
    emailVerified: true,
    emailVerifiedAt: null,
    status: "active",
    sessionId: "",
    sessionExpiresAt: new Date(),
    sessionVersion: 0,
    mustChangePassword: false,
    organizationId: orgCtx.organizationId,
    organization: null,
    roles: session.user.role ? [session.user.role] : [],
    permissions: session.user.permissions || [],
    permissionSet: { hasAny: () => false, has: () => false } as never,
    isSuperAdmin: !!session.user.is_superuser,
    legacyUserId: orgCtx.userId > 0 ? orgCtx.userId : null,
  };

  // Audit requires a concrete legacy user id — fail closed if unavailable.
  const auditUserId = orgCtx.userId;
  if (!Number.isFinite(auditUserId) || auditUserId <= 0) {
    return NextResponse.json(
      { error: "Authenticated user id is not available for audit" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const action = body.action;

  const bindTarget = async (targetUserId: number) => {
    try {
      return await assertLegacyUserInActorOrg(actorCtx, targetUserId);
    } catch (e: unknown) {
      if (e instanceof IdentityError) {
        return NextResponse.json(
          { error: e.message, code: e.code },
          { status: e.status }
        );
      }
      throw e;
    }
  };

  if (action === "assign-role") {
    const targetUserId = body.user_id;
    const roleId = body.role_id;
    if (!targetUserId || !roleId) {
      return NextResponse.json(
        { error: "user_id and role_id required" },
        { status: 400 }
      );
    }
    const bound = await bindTarget(parseInt(String(targetUserId), 10));
    if (bound instanceof NextResponse) return bound;

    // Ensure role belongs to this organization when organization_id is set
    const role = await prisma.roles.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (
      role.organization_id &&
      role.organization_id !== orgCtx.organizationId &&
      !isPlatformAuthority(actorCtx)
    ) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const existing = await prisma.user_roles.findUnique({
      where: {
        user_id_role_id: {
          user_id: bound.id,
          role_id: roleId,
        },
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Already assigned" }, { status: 400 });
    }

    await prisma.user_roles.create({
      data: { user_id: bound.id, role_id: roleId },
    });
    recordAudit({
      action: "user.role.assigned",
      entity_type: "user",
      entity_id: bound.id,
      user_id: auditUserId,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "remove-role") {
    const targetUserId = body.user_id;
    const roleId = body.role_id;
    const bound = await bindTarget(parseInt(String(targetUserId), 10));
    if (bound instanceof NextResponse) return bound;
    await prisma.user_roles.deleteMany({
      where: { user_id: bound.id, role_id: roleId },
    });
    recordAudit({
      action: "user.role.removed",
      entity_type: "user",
      entity_id: bound.id,
      user_id: auditUserId,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "suspend") {
    const targetUserId = body.user_id;
    const bound = await bindTarget(parseInt(String(targetUserId), 10));
    if (bound instanceof NextResponse) return bound;
    const user = await prisma.user.findUnique({
      where: { id: bound.id },
      select: { id: true, is_active: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const newStatus = !user.is_active;
    await prisma.user.update({
      where: { id: bound.id },
      data: { is_active: newStatus },
    });
    recordAudit({
      action: newStatus ? "user.activated" : "user.suspended",
      entity_type: "user",
      entity_id: bound.id,
      user_id: auditUserId,
    });
    return NextResponse.json({ is_active: newStatus });
  }

  if (action === "reset-password") {
    // Administrative password reset — users.manage + same org (or platform)
    const targetUserId = body.user_id;
    const newPassword = body.password;
    if (!newPassword || String(newPassword).length < 12) {
      return NextResponse.json(
        { error: "Password must be at least 12 characters" },
        { status: 400 }
      );
    }
    const bound = await bindTarget(parseInt(String(targetUserId), 10));
    if (bound instanceof NextResponse) return bound;

    // Do not allow org admin to reset platform superusers
    if (bound.is_superuser && !isPlatformAuthority(actorCtx)) {
      return NextResponse.json(
        { error: "Cannot reset password for platform superuser" },
        { status: 403 }
      );
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await prisma.user.update({
      where: { id: bound.id },
      data: { hashed_password: hashed },
    });
    recordAudit({
      action: "user.password.reset",
      entity_type: "user",
      entity_id: bound.id,
      user_id: auditUserId,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "update") {
    const targetUserId = body.user_id;
    const bound = await bindTarget(parseInt(String(targetUserId), 10));
    if (bound instanceof NextResponse) return bound;

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.role !== undefined) {
      try {
        updateData.role = normalizeLegacyInviteRole(body.role, actorCtx);
      } catch (e: unknown) {
        if (e instanceof IdentityError) {
          return NextResponse.json(
            { error: e.message, code: e.code },
            { status: e.status }
          );
        }
        throw e;
      }
    }
    if (body.is_superuser !== undefined) {
      return NextResponse.json(
        {
          error: "Platform authority required to modify superuser status",
          code: "PLATFORM_AUTHORITY_REQUIRED",
        },
        { status: 403 }
      );
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    await prisma.user.update({ where: { id: bound.id }, data: updateData });
    recordAudit({
      action: "user.updated",
      entity_type: "user",
      entity_id: bound.id,
      user_id: auditUserId,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
