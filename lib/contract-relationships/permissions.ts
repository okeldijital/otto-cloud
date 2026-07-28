import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";

export function canManageRelationships(ctx: OrganizationContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const role = (ctx.role || "").toLowerCase();
  if (role === "viewer" || role === "read_only" || role === "readonly") {
    return false;
  }
  return true;
}

export function assertCanManageRelationships(ctx: OrganizationContext): void {
  if (!canManageRelationships(ctx)) {
    throw new IntelligenceError(
      "View-only users cannot create or remove relationships",
      403,
      "RELATIONSHIP_FORBIDDEN"
    );
  }
}
