/**
 * AuthorizationService — sole authorization decision point (A.5).
 * Business modules must not inspect roles directly.
 */

import { IdentityError } from "../domain/types";
import { PermissionSet } from "./permissions";
import { permissionResolver } from "./PermissionResolver";
import type { CurrentIdentityContext } from "../authentication/current-identity-service";

export type AuthzContext = {
  identityId: string;
  organizationId: string | null;
  permissions: string[];
  permissionSet?: PermissionSet;
  isSuperAdmin?: boolean;
  isOwner?: boolean;
};

export class AuthorizationService {
  /**
   * Authorize a permission against a context.
   * Throws IdentityError PERMISSION_DENIED when not allowed.
   */
  authorize(
    context: AuthzContext | CurrentIdentityContext,
    permission: string | string[]
  ): void {
    if (!this.check(context, permission)) {
      const needed = Array.isArray(permission) ? permission : [permission];
      throw new IdentityError(
        "Permission denied",
        403,
        "PERMISSION_DENIED",
        needed
      );
    }
  }

  check(
    context: AuthzContext | CurrentIdentityContext,
    permission: string | string[]
  ): boolean {
    if ("isSuperAdmin" in context && context.isSuperAdmin) return true;
    if ("isOwner" in context && context.isOwner) {
      // owners pass org-scoped admin ops; still require org
    }
    const set =
      "permissionSet" in context && context.permissionSet
        ? context.permissionSet
        : PermissionSet.from(context.permissions || []);
    const needed = Array.isArray(permission) ? permission : [permission];
    return set.hasAny(...needed);
  }

  async authorizeForMembership(
    identityId: string,
    organizationId: string,
    permission: string | string[],
    opts?: { isSuperAdmin?: boolean }
  ): Promise<void> {
    if (opts?.isSuperAdmin) return;
    const resolved = await permissionResolver.resolve(
      identityId,
      organizationId
    );
    if (resolved.membershipStatus !== "active") {
      throw new IdentityError(
        "Active membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }
    this.authorize(
      {
        identityId,
        organizationId,
        permissions: resolved.permissions,
        permissionSet: resolved.permissionSet,
        isOwner: resolved.isOwner,
      },
      permission
    );
  }
}

export const authorizationService = new AuthorizationService();
