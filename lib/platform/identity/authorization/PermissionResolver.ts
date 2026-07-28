/**
 * PermissionResolver — membership → roles → permissions (A.5).
 */

import { membershipRepository } from "../repositories/MembershipRepository";
import { organizationRepository } from "../repositories/OrganizationRepository";
import {
  buildPermissionCacheKey,
  effectivePermissionCache,
} from "./EffectivePermissionCache";
import { PermissionSet } from "./permissions";
import { iamMetrics } from "../metrics/iam-metrics";

export type ResolvedPermissions = {
  permissions: string[];
  roles: string[];
  permissionSet: PermissionSet;
  membershipVersion: number;
  roleVersion: number;
  membershipId: string | null;
  isOwner: boolean;
  membershipStatus: string | null;
};

export class PermissionResolver {
  async resolve(
    identityId: string,
    organizationId: string
  ): Promise<ResolvedPermissions> {
    const membership = await membershipRepository.find(
      identityId,
      organizationId
    );
    if (!membership || membership.status !== "active") {
      return {
        permissions: [],
        roles: [],
        permissionSet: PermissionSet.empty(),
        membershipVersion: 0,
        roleVersion: 0,
        membershipId: membership?.id ?? null,
        isOwner: false,
        membershipStatus: membership?.status ?? null,
      };
    }

    const org = await organizationRepository.findById(organizationId);
    const roleVersion = org?.roleVersion ?? 0;
    const membershipVersion = membership.membershipVersion ?? 0;

    const cacheKey = buildPermissionCacheKey({
      identityId,
      organizationId,
      membershipVersion,
      roleVersion,
    });

    const t0 = Date.now();
    const cached = effectivePermissionCache.get(cacheKey);
    if (cached) {
      iamMetrics.permissionResolve(Date.now() - t0, true);
      return {
        permissions: cached.permissions,
        roles: cached.roles,
        permissionSet: PermissionSet.from(cached.permissions),
        membershipVersion,
        roleVersion,
        membershipId: membership.id,
        isOwner: membership.isOwner,
        membershipStatus: membership.status,
      };
    }

    const roles: string[] = [];
    const permKeys: string[] = [];
    if (membership.role) {
      roles.push(membership.role.key);
      for (const rp of membership.role.permissions) {
        permKeys.push(rp.permission.key);
      }
    }

    // Owner always gets organizations.manage + users.manage
    if (membership.isOwner || org?.ownerIdentityId === identityId) {
      if (!roles.includes("owner")) roles.push("owner");
      for (const k of [
        "organizations.manage",
        "users.manage",
        "roles.manage",
        "security.manage",
      ]) {
        if (!permKeys.includes(k)) permKeys.push(k);
      }
    }

    const permissions = [...new Set(permKeys)];
    effectivePermissionCache.set(cacheKey, { permissions, roles });
    iamMetrics.permissionResolve(Date.now() - t0, false);

    return {
      permissions,
      roles,
      permissionSet: PermissionSet.from(permissions),
      membershipVersion,
      roleVersion,
      membershipId: membership.id,
      isOwner:
        membership.isOwner || org?.ownerIdentityId === identityId,
      membershipStatus: membership.status,
    };
  }
}

export const permissionResolver = new PermissionResolver();
