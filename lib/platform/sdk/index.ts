/**
 * OTTO Platform SDK — IAM v1.0
 *
 * Sole supported integration surface for business modules.
 *
 * @example
 * import {
 *   authenticationService,
 *   authorizationService,
 *   requirePermission,
 *   IDENTITY_EVENTS,
 *   IAM_PLATFORM_VERSION,
 * } from "@/lib/platform/sdk"
 *
 * Do NOT import:
 * - @/lib/platform/identity/repositories/*
 * - @/lib/platform/identity/authentication/repositories/*
 * - Prisma models for IAM tables
 */

export const IAM_PLATFORM_VERSION = "1.0.0";
export const IAM_PLATFORM_NAME = "OTTO IAM Platform";

export * from "./authentication";
export * from "./authorization";
export * from "./identity";
export * from "./organization";
export * from "./membership";
export * from "./session";
export * from "./mfa";
export * from "./permissions";
export * from "./events";

export {
  IAM_CONTRACT_VERSION,
  type IdentityDto,
  type AuthzDecisionDto,
} from "@/lib/platform/identity/contracts";

export {
  iamMetrics,
  type IamMetricsSnapshot,
} from "@/lib/platform/identity/metrics/iam-metrics";

export {
  getPlatformConfig,
  getIamSecurityConfig,
} from "@/lib/platform/config";

export { IdentityError } from "@/lib/platform/identity/domain/types";
