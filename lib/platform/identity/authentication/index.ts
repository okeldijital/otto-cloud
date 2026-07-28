/**
 * Authentication subsystem — proves identity.
 *
 * Password mutations MUST go through CredentialLifecycleService (A.2).
 */

export * from "./crypto";
export {
  validatePasswordStrength,
  assertPasswordStrength,
} from "./passwords/password-policy";
export {
  passwordService,
  PasswordService,
} from "./passwords/PasswordService";
export {
  passwordResetService,
  PasswordResetService,
} from "./passwords/PasswordResetService";
export {
  passwordHistoryService,
  PasswordHistoryService,
} from "./passwords/PasswordHistoryService";
export {
  passwordValidator,
  PasswordValidator,
  estimateEntropy,
} from "./passwords/PasswordValidator";
export type {
  PasswordValidationResult,
  PasswordValidationIssue,
} from "./passwords/PasswordValidator";
export {
  passwordPolicyService,
  PasswordPolicyService,
} from "./policies/PasswordPolicyService";
export {
  passwordRepository,
  PasswordRepository,
} from "./repositories/PasswordRepository";
export {
  credentialLifecycleService,
  CredentialLifecycleService,
} from "./lifecycle/CredentialLifecycleService";
export type { PasswordStatusView } from "./lifecycle/CredentialLifecycleService";

export { mfaService, MfaService } from "./mfa/MfaService";
export {
  mfaChallengeService,
  MfaChallengeService,
} from "./mfa/MfaChallengeService";
export { totpService, TotpService } from "./mfa/TotpService";
export {
  recoveryCodeService,
  RecoveryCodeService,
} from "./mfa/RecoveryCodeService";
export {
  mfaPolicyService,
  MfaPolicyService,
} from "./policies/MfaPolicyService";
export { mfaRepository, MfaRepository } from "./repositories/MfaRepository";
export {
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotp,
} from "./mfa/totp";
export type {
  MfaStatusDto,
  MfaEnrollStartDto,
  LoginNextStep,
  TrustedDeviceDto,
} from "./dto/MfaDto";

export { tokenService, TokenService } from "./tokens/token-service";
export type { AccessTokenClaims } from "./tokens/token-service";

export { cookieService, CookieService } from "./cookies/cookie-service";

export { sessionService, SessionService } from "./sessions/SessionService";
export type {
  SessionCreateResult,
  RefreshResult,
} from "./sessions/SessionService";
export {
  sessionPolicyService,
  SessionPolicyService,
} from "./policies/SessionPolicyService";
export {
  sessionRepository,
  SessionRepository,
} from "./repositories/SessionRepository";
export {
  sessionAuditService,
  SessionAuditService,
} from "./sessions/SessionAuditService";
export {
  sessionCleanupService,
  SessionCleanupService,
} from "./sessions/SessionCleanupService";
export {
  deviceService,
  DeviceService,
  parseUserAgent,
} from "./sessions/DeviceService";
export {
  trustedDeviceService,
  TrustedDeviceService,
} from "./sessions/TrustedDeviceService";
export type {
  SessionListItemDto,
  SessionDetailDto,
  AuthenticationContextDto,
} from "./dto/SessionDto";
export {
  buildAuthenticationContext,
  requireAuthenticationContext,
} from "./context/AuthenticationContext";
export type { AuthenticationContext } from "./context/AuthenticationContext";

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
  requireMembership,
  requireOrganizationOwner,
  identityErrorResponse,
  metaFromRequest,
  clientIp,
  clientUserAgent,
} from "./middleware";

export { emitIdentityEvent, IDENTITY_EVENTS } from "./events";
