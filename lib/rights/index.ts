/**
 * Rights Management Domain (Milestone 6.0)
 * Operational rights derived from Verified Contracts.
 */

export * from "./constants";
export {
  canViewRights,
  canReviewRights,
  canManageRights,
  assertCanReviewRights,
  assertCanManageRights,
} from "./permissions";
export { rightsPromotionService } from "./promotion-service";
export { rightsReviewService } from "./review-service";
export { rightsRegistryService } from "./registry-service";
export { rightsLifecycleService } from "./lifecycle-service";
export { rightsSearchService } from "./search-service";
export { rightsDashboardService } from "./dashboard-service";
export { rightsTimelineService } from "./timeline-service";
export {
  publishRightEvent,
  appendRightTimeline,
  appendRightHistory,
} from "./events";
