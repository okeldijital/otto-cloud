/**
 * Identity platform events — publish via Platform Event Bus (A.10).
 */

export const IDENTITY_EVENTS = {
  LoginSuccess: "identity.login.success",
  LoginFailed: "identity.login.failed",
  Logout: "identity.logout",
  PasswordChanged: "identity.password.changed",
  PasswordResetRequested: "identity.password.reset.requested",
  PasswordResetCompleted: "identity.password.reset.completed",
  SessionCreated: "identity.session.created",
  SessionRevoked: "identity.session.revoked",
  MfaEnabled: "identity.mfa.enabled",
  MfaDisabled: "identity.mfa.disabled",
  InvitationSent: "identity.invitation.sent",
  InvitationAccepted: "identity.invitation.accepted",
  EmailVerified: "identity.email.verified",
  AccountLocked: "identity.account.locked",
} as const;

export type IdentityEventType =
  (typeof IDENTITY_EVENTS)[keyof typeof IDENTITY_EVENTS];
