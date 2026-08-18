/**
 * R5 — IAM → legacy User bridge.
 *
 * Some legacy INT-scoped tables still require users.id. IAM-native sessions
 * may legitimately have no legacyUserId, so routes that write those tables
 * must resolve the bridge server-side rather than inventing an id.
 */

import { prisma } from "@/lib/prisma";
import { OrganizationContext } from "@/lib/auth/organization-context";
import { ResourceAuthError } from "@/lib/auth/resource-authorization";

export async function requireLegacyActorUserId(
  ctx: OrganizationContext,
  email: string | null | undefined
): Promise<number> {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new ResourceAuthError(
      "Authenticated user email is not available",
      403,
      "USER_SCOPE_UNAVAILABLE"
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      organization_id: true,
      tenant_id: true,
      is_active: true,
    },
  });

  if (!user || user.is_active === false) {
    throw new ResourceAuthError(
      "Authenticated user is not available in the legacy user store",
      403,
      "USER_SCOPE_UNAVAILABLE"
    );
  }

  const belongsToOrg =
    user.tenant_id === ctx.tenantId ||
    user.organization_id === ctx.organizationId ||
    user.organization_id === ctx.tenantId;

  if (!belongsToOrg) {
    throw new ResourceAuthError(
      "Authenticated user is not scoped to the active organization",
      403,
      "USER_SCOPE_UNAVAILABLE"
    );
  }

  return user.id;
}
