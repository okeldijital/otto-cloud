import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";

export function canManageLifecycle(ctx: OrganizationContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const role = (ctx.role || "").toLowerCase();
  if (role === "viewer" || role === "read_only" || role === "readonly") {
    return false;
  }
  return true;
}

export function assertCanManageLifecycle(ctx: OrganizationContext): void {
  if (!canManageLifecycle(ctx)) {
    throw new IntelligenceError(
      "View-only users cannot change lifecycle state",
      403,
      "LIFECYCLE_FORBIDDEN"
    );
  }
}
