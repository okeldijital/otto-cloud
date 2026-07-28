/**
 * Platform SDK — Authentication (IAM v1.0)
 */

export {
  authenticationService,
  AuthenticationService,
  type LoginResult,
  type PublicSessionView,
} from "@/lib/platform/identity/authentication/authentication-service";

export {
  requireAuthentication,
  requireActiveSession,
  requireEmailVerification,
  identityErrorResponse,
  metaFromRequest,
  clientIp,
  clientUserAgent,
} from "@/lib/platform/identity/authentication/middleware";

export {
  buildAuthenticationContext,
  requireAuthenticationContext,
  type AuthenticationContext,
} from "@/lib/platform/identity/authentication/context/AuthenticationContext";

export {
  credentialLifecycleService,
  CredentialLifecycleService,
} from "@/lib/platform/identity/authentication/lifecycle/CredentialLifecycleService";

export type { LoginNextStep } from "@/lib/platform/identity/contracts";
