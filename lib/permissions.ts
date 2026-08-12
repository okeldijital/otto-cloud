/**
 * Permission helpers — IAM only (A.4.5).
 * Prefer requirePermission from @/lib/platform/identity for new routes.
 *
 * A.8 Group B: organization admin ≠ platform superuser.
 */

import { getServerSession, type AuthSessionUser } from "@/lib/auth/session";
import { PermissionSet } from "@/lib/platform/sdk";
import { isPlatformAuthority } from "@/lib/auth/privilege-authorization";

export type SessionUser = AuthSessionUser;

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

function perms(user: SessionUser): PermissionSet {
  return PermissionSet.from(user.permissions || []);
}

/**
 * Organization administrator (users/org/security manage) — NOT platform superuser.
 * Does not accept bare role strings admin/org_admin as platform authority.
 */
export async function requireAdmin(): Promise<{
  user: SessionUser;
  error?: Response;
}> {
  const session = await getServerSession();
  if (!session?.user) {
    return {
      user: null as unknown as SessionUser,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    };
  }

  const user = session.user;
  const p = perms(user);

  // Org admin surface: manage users/org/security. platform.admin permission alone
  // is NOT platform authority (seed drift); org owners may still have users.manage.
  const allowed =
    user.is_superuser ||
    p.has("security.manage") ||
    p.has("users.manage") ||
    p.has("organizations.manage");

  if (!allowed) {
    return {
      user,
      error: new Response(
        JSON.stringify({ error: "Forbidden: admin access required" }),
        { status: 403 }
      ),
    };
  }

  return { user };
}

/** Explicit platform authority (superuser / super_admin / platform.admin). */
export async function requirePlatformAdmin(): Promise<{
  user: SessionUser;
  error?: Response;
}> {
  const session = await getServerSession();
  if (!session?.user) {
    return {
      user: null as unknown as SessionUser,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      }),
    };
  }
  const user = session.user;
  if (
    !isPlatformAuthority({
      isSuperAdmin: user.is_superuser,
      permissions: user.permissions,
      roles: user.role ? [user.role] : [],
    })
  ) {
    return {
      user,
      error: new Response(
        JSON.stringify({
          error: "Forbidden: platform authority required",
          code: "PLATFORM_AUTHORITY_REQUIRED",
        }),
        { status: 403 }
      ),
    };
  }
  return { user };
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
  // Superuser is platform authority; bare platform.admin permission is not.
  if (currentUser.is_superuser) return true;
  const p = perms(currentUser);
  if (p.has("organizations.manage") || p.has("users.manage")) {
    return currentUser.organization_id === targetOrgId;
  }
  return currentUser.organization_id === targetOrgId;
}

export function canManageUsers(currentUser: SessionUser): boolean {
  if (currentUser.is_superuser) return true;
  return perms(currentUser).has("users.manage");
}

/** Permission-first check for client or server helpers */
export function hasPermission(
  user: SessionUser | null | undefined,
  permission: string
): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  return perms(user).has(permission);
}
