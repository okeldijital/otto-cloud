import type { OrganizationContext } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";

export function canViewEntitlements(ctx: OrganizationContext): boolean {
  return !!ctx.organizationId;
}

export function canReviewEntitlements(ctx: OrganizationContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const role = (ctx.role || "").toLowerCase();
  if (role === "viewer" || role === "read_only" || role === "readonly") {
    return false;
  }
  return true;
}

export function canManageEntitlements(ctx: OrganizationContext): boolean {
  if (ctx.isSuperAdmin) return true;
  const role = (ctx.role || "").toLowerCase();
  return (
    role === "admin" ||
    role === "owner" ||
    role === "org_admin" ||
    role === "member"
  );
}

export function assertCanReviewEntitlements(ctx: OrganizationContext): void {
  if (!canReviewEntitlements(ctx)) {
    throw new IntelligenceError(
      "View-only users cannot review entitlements",
      403,
      "ENTITLEMENT_REVIEW_FORBIDDEN"
    );
  }
}

export function assertCanManageEntitlements(ctx: OrganizationContext): void {
  if (!canManageEntitlements(ctx)) {
    throw new IntelligenceError(
      "Insufficient permissions to manage entitlements",
      403,
      "ENTITLEMENT_MANAGE_FORBIDDEN"
    );
  }
}
