import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "../types/errors";

/**
 * View-only users cannot modify verification.
 * Superusers, admins, managers, and standard users may verify.
 */
export function canVerifyDocuments(ctx: OrganizationContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const role = (ctx.role || "").toLowerCase();
  if (role === "viewer" || role === "read_only" || role === "readonly") {
    return false;
  }
  return true;
}

export function assertCanVerify(ctx: OrganizationContext): void {
  if (!canVerifyDocuments(ctx)) {
    throw new IntelligenceError(
      "View-only users cannot modify verification",
      403,
      "VERIFICATION_FORBIDDEN"
    );
  }
}
