/**
 * Royalty Entitlement Domain (Milestone 7.0)
 * Financial participation derived from approved Rights — not calculations.
 */

export * from "./constants";
export {
  canViewEntitlements,
  canReviewEntitlements,
  canManageEntitlements,
  assertCanReviewEntitlements,
  assertCanManageEntitlements,
} from "./permissions";
export { entitlementPromotionService } from "./promotion-service";
export { entitlementReviewService } from "./review-service";
export { entitlementRegistryService } from "./registry-service";
export { entitlementSearchService } from "./search-service";
export { entitlementDashboardService } from "./dashboard-service";
export {
  publishEntitlementEvent,
  appendEntitlementTimeline,
  appendEntitlementHistory,
} from "./events";
