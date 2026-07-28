/**
 * Permission helpers — IAM only (A.4.5).
 * Prefer requirePermission from @/lib/platform/identity for new routes.
 */

import { getServerSession, type AuthSessionUser } from "@/lib/auth/session";
import { PermissionSet } from "@/lib/platform/sdk";

export type SessionUser = AuthSessionUser;

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

function perms(user: SessionUser): PermissionSet {
  return PermissionSet.from(user.permissions || []);
}

/** Admin = superuser OR platform/org admin permissions (not string role alone). */
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

  const allowed =
    user.is_superuser ||
    p.has("security.manage") ||
    p.has("users.manage") ||
    p.has("organizations.manage") ||
    p.has("platform.admin") ||
    // Temporary bridge until all admins have IAM roles seeded
    user.role === "org_admin" ||
    user.role === "platform_admin" ||
    user.role === "admin";

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
  const p = perms(currentUser);
  if (p.has("organizations.manage") || p.has("users.manage")) {
    return currentUser.organization_id === targetOrgId || !targetOrgId;
  }
  return currentUser.organization_id === targetOrgId;
}

export function canManageUsers(currentUser: SessionUser): boolean {
  if (currentUser.is_superuser) return true;
  return (
    perms(currentUser).has("users.manage") ||
    currentUser.role === "org_admin" ||
    currentUser.role === "admin"
  );
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
