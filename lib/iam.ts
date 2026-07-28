/**
 * IAM helpers for route handlers — backed by platform identity (not NextAuth).
 */

import { getServerSession, type AuthSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  currentIdentityService,
  PermissionSet,
} from "@/lib/platform/identity";

export type SessionUser = AuthSessionUser;

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/** Legacy permission cache clear (no-op when using IAM membership permissions). */
export function clearPermissionCache(): void {
  /* IAM permissions are resolved per-request; nothing to clear. */
}

/** Resolve IAM permissions for identity UUID (preferred). */
export async function getIdentityPermissions(
  identityId: string,
  organizationId?: string | null
): Promise<Set<string>> {
  const membership = await prisma.iamOrganizationMembership.findFirst({
    where: {
      identityId,
      status: "active",
      ...(organizationId ? { organizationId } : {}),
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });
  const set = new Set<string>();
  if (membership?.role) {
    for (const rp of membership.role.permissions) {
      set.add(rp.permission.key);
    }
  }
  return set;
}

/**
 * Legacy numeric user permission lookup (old user_roles tables).
 * Prefer getIdentityPermissions after cutover.
 */
export async function getUserPermissions(userId: number): Promise<Set<string>> {
  // Bridge: if this user is linked to IAM identity, use IAM permissions
  const identity = await prisma.iamIdentity.findUnique({
    where: { legacyUserId: userId },
  });
  if (identity) {
    return getIdentityPermissions(identity.id);
  }

  const userRoles = await prisma.user_roles.findMany({
    where: { user_id: userId },
    include: {
      roles: {
        include: {
          role_permissions: { include: { permissions: true } },
        },
      },
    },
  });

  const permSet = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.roles.role_permissions) {
      permSet.add(rp.permissions.code);
    }
  }
  return permSet;
}

export async function hasPermission(
  userId: number,
  permission: string
): Promise<boolean> {
  if (!permission) return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { is_superuser: true },
  });
  if (user?.is_superuser) return true;
  const perms = await getUserPermissions(userId);
  if (perms.has(permission)) return true;
  const parts = permission.split(".");
  if (parts.length === 2) {
    const wildcard = `${parts[0]}.*`;
    if (perms.has(wildcard)) return true;
  }
  return false;
}

export async function requirePermission(
  permission: string
): Promise<{ user: SessionUser; error?: Response }> {
  const session = await getServerSession();
  if (!session?.user) {
    return {
      user: null as unknown as SessionUser,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    };
  }
  const su = session.user;
  if (su.is_superuser) return { user: su };

  const permSet = PermissionSet.from(su.permissions || []);
  if (permSet.has(permission) || permSet.has(`${permission.split(".")[0]}.*`)) {
    return { user: su };
  }

  // Fallback legacy numeric check
  if (su.legacyUserId != null) {
    const allowed = await hasPermission(su.legacyUserId, permission);
    if (allowed) return { user: su };
  }

  return {
    user: su,
    error: new Response(
      JSON.stringify({ error: `Forbidden: missing permission ${permission}` }),
      { status: 403 }
    ),
  };
}

export async function requireAdmin(): Promise<{
  user: SessionUser;
  error?: Response;
}> {
  const r = await requirePermission("admin.access");
  if (r.error) {
    // Also accept org_admin / platform admin via session role
    const session = await getServerSession();
    if (
      session?.user &&
      (session.user.is_superuser ||
        session.user.role === "admin" ||
        session.user.role === "org_admin" ||
        session.user.role === "platform_admin")
    ) {
      return { user: session.user };
    }
    return r;
  }
  const su = r.user;
  if (
    !su.is_superuser &&
    su.role !== "admin" &&
    su.role !== "org_admin" &&
    su.role !== "platform_admin"
  ) {
    return {
      user: su,
      error: new Response(
        JSON.stringify({ error: "Forbidden: admin access required" }),
        { status: 403 }
      ),
    };
  }
  return r;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession();
  if (!session?.user) return null;
  return session.user;
}

export function canManageOrg(
  currentUser: SessionUser,
  targetOrgId: string
): boolean {
  if (currentUser.is_superuser) return true;
  return currentUser.organization_id === targetOrgId;
}

export function canManageUsers(currentUser: SessionUser): boolean {
  return (
    !!currentUser.is_superuser ||
    currentUser.role === "admin" ||
    currentUser.role === "org_admin"
  );
}

export async function hasAnyPermission(
  userId: number,
  permissions: string[]
): Promise<boolean> {
  for (const p of permissions) {
    if (await hasPermission(userId, p)) return true;
  }
  return false;
}

/** Prefer this for new code — uses IAM request context */
export async function getCurrentIdentity() {
  return currentIdentityService.resolveFromRequest({
    cookieHeader: null,
  });
}
