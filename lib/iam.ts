import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  organization_id: string;
  role: string | null;
  is_superuser: boolean | null;
};

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

let permissionCache: Map<string, Set<string>> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000;

function extractPermissionCodes(allPermissions: string): string[] {
  if (!allPermissions) return [];
  if (allPermissions.startsWith("[")) {
    try { return JSON.parse(allPermissions); } catch { return allPermissions.split(",").map(p => p.trim()).filter(Boolean); }
  }
  return allPermissions.split(",").map(p => p.trim()).filter(Boolean);
}

export async function getUserPermissions(userId: number): Promise<Set<string>> {
  const cacheKey = `user:${userId}`;
  const now = Date.now();
  if (permissionCache && cacheTimestamp > now - CACHE_TTL) {
    const cached = permissionCache.get(cacheKey);
    if (cached) return cached;
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

  if (!permissionCache) permissionCache = new Map();
  permissionCache.set(cacheKey, permSet);
  cacheTimestamp = now;
  return permSet;
}

export async function hasPermission(userId: number, permission: string): Promise<boolean> {
  if (!permission) return true;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { is_superuser: true } });
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

export async function requirePermission(permission: string): Promise<{ user: SessionUser; error?: Response }> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { user: null as any, error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) };
  }
  const su = session.user as SessionUser;
  if (su.is_superuser) return { user: su };
  const userId = parseInt(su.id);
  if (isNaN(userId)) return { user: su, error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) };
  const allowed = await hasPermission(userId, permission);
  if (!allowed) {
    return { user: su, error: new Response(JSON.stringify({ error: `Forbidden: missing permission ${permission}` }), { status: 403 }) };
  }
  return { user: su };
}

export async function requireAdmin(): Promise<{ user: SessionUser; error?: Response }> {
  const r = await requirePermission("admin.access");
  if (r.error) return r;
  const su = r.user;
  if (!su.is_superuser && su.role !== "admin") {
    return { user: su, error: new Response(JSON.stringify({ error: "Forbidden: admin access required" }), { status: 403 }) };
  }
  return r;
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

export async function hasAnyPermission(userId: number, permissions: string[]): Promise<boolean> {
  for (const p of permissions) {
    if (await hasPermission(userId, p)) return true;
  }
  return false;
}

export async function getUserRoleIds(userId: number): Promise<number[]> {
  const userRoles = await prisma.user_roles.findMany({
    where: { user_id: userId },
    select: { role_id: true },
  });
  return userRoles.map(ur => ur.role_id);
}

export function clearPermissionCache() {
  permissionCache = null;
  cacheTimestamp = 0;
}
