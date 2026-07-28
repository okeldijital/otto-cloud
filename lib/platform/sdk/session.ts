/**
 * Platform SDK — Sessions (IAM v1.0)
 */

export {
  sessionService,
  SessionService,
  type SessionCreateResult,
  type RefreshResult,
} from "@/lib/platform/identity/authentication/sessions/SessionService";

export {
  sessionCleanupService,
  SessionCleanupService,
} from "@/lib/platform/identity/authentication/sessions/SessionCleanupService";

export type {
  SessionListItemDto,
  SessionDetailDto,
  DeviceSummaryDto,
} from "@/lib/platform/identity/contracts";
