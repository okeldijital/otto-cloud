/**
 * Session-scoped effective permission cache (A.5).
 * Key: identityId + organizationId + membershipVersion + roleVersion + catalogVersion
 */

import { PERMISSION_CATALOG_VERSION } from "../permissions/catalog";

type CacheEntry = {
  permissions: string[];
  roles: string[];
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

export function buildPermissionCacheKey(params: {
  identityId: string;
  organizationId: string;
  membershipVersion: number;
  roleVersion: number;
}): string {
  return [
    params.identityId,
    params.organizationId,
    String(params.membershipVersion),
    String(params.roleVersion),
    String(PERMISSION_CATALOG_VERSION),
  ].join(":");
}

export { buildPermissionCacheKey as buildKey };

export class EffectivePermissionCache {
  get(key: string): { permissions: string[]; roles: string[] } | null {
    const e = store.get(key);
    if (!e) return null;
    if (e.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return { permissions: e.permissions, roles: e.roles };
  }

  set(
    key: string,
    value: { permissions: string[]; roles: string[] },
    ttlMs = TTL_MS
  ): void {
    store.set(key, {
      permissions: value.permissions,
      roles: value.roles,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidatePrefix(identityId: string, organizationId?: string): void {
    const prefix = organizationId
      ? `${identityId}:${organizationId}:`
      : `${identityId}:`;
    for (const k of store.keys()) {
      if (k.startsWith(prefix)) store.delete(k);
    }
  }

  clear(): void {
    store.clear();
  }
}

export const effectivePermissionCache = new EffectivePermissionCache();
