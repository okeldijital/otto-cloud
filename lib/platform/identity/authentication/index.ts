/**
 * Authentication subsystem — proves identity.
 *
 * Identity (domain) is independent of how authentication is performed.
 * Future: passkeys, SSO, API keys, service accounts plug in here without
 * changing the Identity model.
 *
 * A.1 MUST NOT use NextAuth. Own stack:
 * POST /api/auth/login → AuthenticationService → SessionService → CookieService
 */

export * from "./crypto";
export {
  validatePasswordStrength,
  assertPasswordStrength,
} from "./passwords/password-policy";
export {
  passwordService,
  PasswordService,
} from "./passwords/password-service";
export { mfaService, MfaService } from "./mfa/mfa-service";
export {
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotp,
} from "./mfa/totp";

export { tokenService, TokenService } from "./tokens/token-service";
export type { AccessTokenClaims } from "./tokens/token-service";

export { cookieService, CookieService } from "./cookies/cookie-service";

export { sessionService, SessionService } from "./sessions/session-service";
export type {
  SessionCreateResult,
  RefreshResult,
} from "./sessions/session-service";

export {
  lockoutService,
  LockoutService,
} from "./lockout/lockout-service";

export {
  rateLimitService,
  RateLimitService,
} from "./rate-limit/rate-limit-service";

export {
  emailVerificationService,
  EmailVerificationService,
} from "./email/email-verification-service";

export {
  authenticationService,
  AuthenticationService,
} from "./authentication-service";
export type { LoginResult, PublicSessionView } from "./authentication-service";

export {
  currentIdentityService,
  CurrentIdentityService,
} from "./current-identity-service";
export type { CurrentIdentityContext } from "./current-identity-service";

export {
  requireAuthentication,
  requireActiveSession,
  requireEmailVerification,
  requireOrganization,
  requirePermission,
  identityErrorResponse,
  metaFromRequest,
  clientIp,
  clientUserAgent,
} from "./middleware";

export { emitIdentityEvent, IDENTITY_EVENTS } from "./events";
