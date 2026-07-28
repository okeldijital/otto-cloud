import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";

export function canViewRights(ctx: OrganizationContext): boolean {
  return !!ctx.organizationId;
}

export function canReviewRights(ctx: OrganizationContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const role = (ctx.role || "").toLowerCase();
  if (role === "viewer" || role === "read_only" || role === "readonly") {
    return false;
  }
  return true;
}

export function canManageRights(ctx: OrganizationContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const role = (ctx.role || "").toLowerCase();
  return (
    role === "admin" ||
    role === "owner" ||
    role === "org_admin" ||
    role === "member"
  );
}

export function assertCanReviewRights(ctx: OrganizationContext): void {
  if (!canReviewRights(ctx)) {
    throw new IntelligenceError(
      "View-only users cannot review rights",
      403,
      "RIGHTS_REVIEW_FORBIDDEN"
    );
  }
}

export function assertCanManageRights(ctx: OrganizationContext): void {
  if (!canManageRights(ctx)) {
    throw new IntelligenceError(
      "Insufficient permissions to manage rights",
      403,
      "RIGHTS_MANAGE_FORBIDDEN"
    );
  }
}
