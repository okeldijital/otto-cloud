/**
 * AuthorizationService — authoritative authorization decision point.
 *
 * Business modules should authorize by permission and, for organization-scoped
 * resources, explicitly bind the requested organization to the authenticated
 * organization context. Client-supplied organization IDs are never sufficient
 * to establish access.
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
  authorize(
    context: AuthzContext | CurrentIdentityContext,
    permission: string | string[]
  ): void {
    if (!this.check(context, permission)) {
      const needed = Array.isArray(permission) ? permission : [permission];
      throw new IdentityError("Permission denied", 403, "PERMISSION_DENIED", needed);
    }
  }

  /**
   * Authorize an organization-scoped operation. The resource organization
   * must match the organization resolved from the authenticated context.
   * Platform super-admin operations may explicitly span organizations.
   */
  authorizeForOrganization(
    context: AuthzContext | CurrentIdentityContext,
    organizationId: string,
    permission: string | string[]
  ): void {
    if (!organizationId || typeof organizationId !== "string") {
      throw new IdentityError("Organization context required", 403, "ORGANIZATION_REQUIRED");
    }

    if (context.isSuperAdmin) {
      this.authorize(context, permission);
      return;
    }

    if (!context.organizationId) {
      throw new IdentityError(
        "Active organization membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }

    if (context.organizationId !== organizationId) {
      throw new IdentityError("Permission denied", 403, "PERMISSION_DENIED");
    }

    this.authorize(context, permission);
  }

  check(
    context: AuthzContext | CurrentIdentityContext,
    permission: string | string[]
  ): boolean {
    if ("isSuperAdmin" in context && context.isSuperAdmin) return true;

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
    if (!organizationId) {
      throw new IdentityError("Organization context required", 403, "ORGANIZATION_REQUIRED");
    }

    const resolved = await permissionResolver.resolve(identityId, organizationId);
    if (resolved.membershipStatus !== "active") {
      throw new IdentityError("Active membership required", 403, "MEMBERSHIP_REQUIRED");
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
