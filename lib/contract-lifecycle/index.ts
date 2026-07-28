/**
 * Contract Lifecycle Management (Milestone 4.1)
 * Deterministic, auditable, event-driven — no AI.
 */

export {
  LIFECYCLE_STATUS,
  LIFECYCLE_STATUS_LABELS,
  LIFECYCLE_TRANSITIONS,
  LIFECYCLE_EVENTS,
  KEY_DATE_TYPES,
  KEY_DATE_LABELS,
  RENEWAL_STATUS,
  canTransition,
} from "./constants";
export type { LifecycleStatus, KeyDateType } from "./constants";
export {
  ContractLifecycleService,
  contractLifecycleService,
} from "./lifecycle-service";
export { canManageLifecycle, assertCanManageLifecycle } from "./permissions";
