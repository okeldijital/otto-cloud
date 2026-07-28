/**
 * Permission helpers — IAM session (NextAuth removed).
 */

import { getServerSession, type AuthSessionUser } from "@/lib/auth/session";

export type Role = "admin" | "manager" | "viewer" | "user" | "org_admin" | "member";

export type SessionUser = AuthSessionUser;

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
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

  if (
    !user.is_superuser &&
    user.role !== "admin" &&
    user.role !== "org_admin" &&
    user.role !== "platform_admin"
  ) {
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
  return currentUser.organization_id === targetOrgId;
}

export function canManageUsers(currentUser: SessionUser): boolean {
  return (
    !!currentUser.is_superuser ||
    currentUser.role === "admin" ||
    currentUser.role === "org_admin"
  );
}
