/**
 * Bind admin route path organization ids to the caller's authorized scope.
 */

import { IdentityError } from "../domain/types";
import type { CurrentIdentityContext } from "../authentication/current-identity-service";
import {
  assertOrganizationTarget,
  isPlatformAuthority,
} from "@/lib/auth/privilege-authorization";

export function assertAdminOrganizationPath(
  ctx: CurrentIdentityContext,
  pathOrganizationId: string
): void {
  assertOrganizationTarget(ctx, pathOrganizationId, {
    allowPlatformCrossOrg: true,
  });
}

/**
 * List/create organizations across the platform requires platform authority.
 */
export function assertPlatformOrgDirectory(ctx: CurrentIdentityContext): void {
  if (!isPlatformAuthority(ctx)) {
    throw new IdentityError(
      "Platform authority required for cross-organization directory",
      403,
      "PLATFORM_AUTHORITY_REQUIRED"
    );
  }
}
