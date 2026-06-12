import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export type Role = "admin" | "manager" | "viewer" | "user";

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  organization_id: string;
  role: string | null;
  is_superuser: boolean | null;
}

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

export async function requireAdmin(): Promise<{ user: SessionUser; error?: Response }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { user: null as any, error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
  }

  const user = session.user as SessionUser;

  if (!user.is_superuser && user.role !== "admin") {
    return { user, error: new Response(JSON.stringify({ error: "Forbidden: admin access required" }), { status: 403 }) };
  }

  return { user };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session.user as SessionUser;
}

export function canManageOrg(currentUser: SessionUser, targetOrgId: string): boolean {
  if (currentUser.is_superuser) return true;
  return currentUser.organization_id === targetOrgId;
}

export function canManageUsers(currentUser: SessionUser): boolean {
  return !!currentUser.is_superuser || currentUser.role === "admin";
}
