import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import { ResourceAuthError } from "@/lib/auth/resource-authorization";

/**
 * Resolve the authenticated IAM identity to the legacy integer user id used by
 * contract-intelligence persistence. This must remain server-side and fail
 * closed; never accept a client actor id or invent a fallback.
 *
 * NOTE: The concrete legacy identity linkage should be implemented against the
 * authoritative legacy users ↔ IAM identity mapping in the Prisma schema.
 */
export async function requireLegacyActorUserId(ctx: OrganizationContext): Promise<number> {
  if (ctx.userId > 0) return ctx.userId;

  throw new ResourceAuthError(
    "Authenticated user has no legacy actor mapping",
    403,
    "USER_SCOPE_UNAVAILABLE"
  );
}
