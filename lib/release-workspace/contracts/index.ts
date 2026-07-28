/**
 * Release Workspace — Contract Integration (Milestone 5.0)
 * Consumer of Verified Contract, Relationships, Lifecycle, Platform Events.
 * Owns projections + UX only.
 */

export {
  HEALTH_STATUS,
  HEALTH_STATUS_LABELS,
  EXPIRING_SOON_DAYS,
  RELEASE_CONTRACT_EVENTS,
  TIMELINE_ENTRY_TYPES,
} from "./constants";
export type { HealthStatus } from "./constants";
export {
  computeContractHealth,
  aggregateReleaseHealth,
} from "./health-service";
export type { HealthInput, HealthResult } from "./health-service";
export {
  releaseContractSyncService,
  ReleaseContractSyncService,
} from "./sync-service";
export {
  releaseContractReadModelService,
  ReleaseContractReadModelService,
} from "./read-model-service";
export {
  releaseTimelineService,
  ReleaseTimelineService,
} from "./timeline-service";
export { registerReleaseContractSubscriber } from "./event-subscriber";
export {
  registerReleaseContractProjection,
  releaseContractProjectionDefinition,
  RELEASE_CONTRACT_PROJECTION_NAME,
  releaseKey,
  parseReleaseKey,
} from "./projection";
