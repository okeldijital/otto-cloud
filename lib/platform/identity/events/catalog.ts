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
  PasswordExpired: "identity.password.expired",
  PasswordForceReset: "identity.password.force_reset",
  SessionCreated: "identity.session.created",
  SessionRefreshed: "identity.session.refreshed",
  SessionRevoked: "identity.session.revoked",
  SessionExpired: "identity.session.expired",
  SessionLogoutAll: "identity.session.logout_all",
  SessionNewDevice: "identity.session.new_device",
  SessionTrusted: "identity.session.trusted",
  SessionUntrusted: "identity.session.untrusted",
  MfaEnabled: "identity.mfa.enabled",
  MfaDisabled: "identity.mfa.disabled",
  MfaChallengeCreated: "identity.mfa.challenge.created",
  MfaChallengeCompleted: "identity.mfa.challenge.completed",
  MfaChallengeFailed: "identity.mfa.challenge.failed",
  MfaRecoveryUsed: "identity.mfa.recovery.used",
  MfaRecoveryRegenerated: "identity.mfa.recovery.regenerated",
  InvitationSent: "identity.invitation.sent",
  InvitationAccepted: "identity.invitation.accepted",
  InvitationCreated: "identity.invitation.created",
  InvitationCancelled: "identity.invitation.cancelled",
  InvitationExpired: "identity.invitation.expired",
  EmailVerificationSent: "identity.email.verification.sent",
  EmailVerified: "identity.email.verified",
  AccountLocked: "identity.account.locked",
  AccountUnlocked: "identity.account.unlocked",
  // Organization / membership / RBAC (A.5)
  OrganizationCreated: "identity.organization.created",
  OrganizationUpdated: "identity.organization.updated",
  OrganizationArchived: "identity.organization.archived",
  OrganizationSwitched: "identity.organization.switched",
  MembershipCreated: "identity.membership.created",
  MembershipUpdated: "identity.membership.updated",
  MembershipSuspended: "identity.membership.suspended",
  MembershipReactivated: "identity.membership.reactivated",
  MembershipRemoved: "identity.membership.removed",
  RoleAssigned: "identity.role.assigned",
  RoleRemoved: "identity.role.removed",
} as const;

export type IdentityEventType =
  (typeof IDENTITY_EVENTS)[keyof typeof IDENTITY_EVENTS];
