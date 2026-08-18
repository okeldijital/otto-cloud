/**
 * IAM helpers for route handlers — backed by platform identity.
 */

import { getServerSession, type AuthSessionUser } from "@/lib/auth/session";
import { PermissionSet } from "@/lib/platform/sdk";

export type SessionUser = AuthSessionUser;

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/** IAM permissions are resolved per-request; nothing to clear. */
export function clearPermissionCache(): void {
  /* no-op */
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

  const user = session.user;
  if (user.is_superuser) return { user };

  const permissions = PermissionSet.from(user.permissions || []);
  if (
    permissions.has(permission) ||
    permissions.has(`${permission.split(".")[0]}.*`)
  ) {
    return { user };
  }

  return {
    user,
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
  const permissions = PermissionSet.from(user.permissions || []);
  const allowed =
    user.is_superuser ||
    permissions.has("security.manage") ||
    permissions.has("users.manage") ||
    permissions.has("organizations.manage") ||
    permissions.has("admin.access") ||
    user.role === "org_admin" ||
    user.role === "platform_admin" ||
    user.role === "super_admin" ||
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
