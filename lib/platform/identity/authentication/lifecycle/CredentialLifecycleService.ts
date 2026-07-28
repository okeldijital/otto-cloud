/**
 * CredentialLifecycleService — sole entry point for password credential mutations (A.2).
 *
 * Authentication consumes credentials; it must not update password hashes directly.
 */

import { IdentityError } from "../../domain/types";
import { passwordService } from "../passwords/PasswordService";
import { passwordResetService } from "../passwords/PasswordResetService";
import { passwordValidator } from "../passwords/PasswordValidator";
import { passwordPolicyService } from "../policies/PasswordPolicyService";
import { passwordRepository } from "../repositories/PasswordRepository";
import { sessionService } from "../sessions/session-service";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";

export type PasswordStatusView = {
  hasPassword: boolean;
  lastChangedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  mustChangePassword: boolean;
  mustChangePasswordReason: string | null;
  sessionVersion: number;
  policy: ReturnType<typeof passwordPolicyService.getClientPolicy>;
};

export class CredentialLifecycleService {
  /**
   * Authenticated user changes password.
   * Current session stays active; other sessions revoked; sessionVersion++.
   */
  async changePassword(params: {
    identityId: string;
    currentPassword: string;
    newPassword: string;
    currentSessionId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ sessionVersion: number }> {
    const identity = await passwordRepository.findIdentityWithCredential(
      params.identityId
    );
    if (!identity) {
      throw new IdentityError("Identity not found", 404, "IDENTITY_NOT_FOUND");
    }

    const cred = identity.passwordCreds[0];
    if (!cred) {
      throw new IdentityError(
        "No password credential",
        400,
        "NO_PASSWORD_CREDENTIAL"
      );
    }

    await passwordService.assertMinimumAge(cred.passwordChangedAt);
    await passwordService.verifyCurrent(
      params.identityId,
      params.currentPassword
    );

    await passwordService.assertPolicyAndHistory({
      identityId: params.identityId,
      newPassword: params.newPassword,
      currentHash: cred.passwordHash,
    });

    const { sessionVersion } = await passwordService.hashAndStore({
      identityId: params.identityId,
      credentialId: cred.id,
      previousHash: cred.passwordHash,
      newPassword: params.newPassword,
    });

    await sessionService.revokeAllSessions(
      params.identityId,
      "password_changed",
      params.currentSessionId ?? undefined
    );

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.PasswordChanged,
      identityId: params.identityId,
      payload: {
        method: "change",
        sessionVersion,
        revokedOtherSessions: true,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { sessionVersion };
  }

  /** Forgot password — no enumeration */
  async requestPasswordReset(params: {
    email: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return passwordResetService.requestReset(params);
  }

  /**
   * Complete reset with token — revokes ALL sessions, sessionVersion++.
   */
  async resetPassword(params: {
    token: string;
    newPassword: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ identityId: string; sessionVersion: number }> {
    const consumed = await passwordResetService.consumeToken(params.token);

    await passwordService.assertPolicyAndHistory({
      identityId: consumed.identityId,
      newPassword: params.newPassword,
      currentHash: consumed.currentHash,
    });

    const { sessionVersion } = await passwordService.hashAndStore({
      identityId: consumed.identityId,
      credentialId: consumed.credentialId,
      previousHash: consumed.currentHash,
      newPassword: params.newPassword,
    });

    await sessionService.revokeAllSessions(
      consumed.identityId,
      "password_reset"
    );

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.PasswordResetCompleted,
      identityId: consumed.identityId,
      payload: {
        email: consumed.email,
        sessionVersion,
        allSessionsRevoked: true,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { identityId: consumed.identityId, sessionVersion };
  }

  /**
   * Admin forces password reset on next login.
   * Revokes all sessions; user must reset password.
   */
  async forcePasswordReset(params: {
    identityId: string;
    reason?: string;
    actorIdentityId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await passwordRepository.setMustChangePassword({
      identityId: params.identityId,
      reason: params.reason ?? "admin_force_reset",
    });

    const sessionVersion = await passwordRepository.incrementSessionVersion(
      params.identityId
    );

    await sessionService.revokeAllSessions(
      params.identityId,
      "force_password_reset"
    );

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.PasswordForceReset,
      identityId: params.identityId,
      payload: {
        reason: params.reason ?? "admin_force_reset",
        actorIdentityId: params.actorIdentityId,
        sessionVersion,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  /** Mark expired password (login gate); optional event */
  async expirePassword(params: {
    identityId: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await passwordRepository.setMustChangePassword({
      identityId: params.identityId,
      reason: "password_expired",
    });
    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.PasswordExpired,
      identityId: params.identityId,
      payload: { reason: "password_expired" },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  validatePassword(password: string) {
    return passwordValidator.validate(password);
  }

  async revokeCredential(params: {
    identityId: string;
    reason?: string;
  }): Promise<void> {
    // Disable password by forcing reset (no silent empty hash)
    await this.forcePasswordReset({
      identityId: params.identityId,
      reason: params.reason ?? "credential_revoked",
    });
  }

  /** Alias for change/reset rotate path */
  async rotateCredential(params: {
    identityId: string;
    currentPassword: string;
    newPassword: string;
    currentSessionId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.changePassword(params);
  }

  async getPasswordStatus(identityId: string): Promise<PasswordStatusView> {
    const row = await passwordRepository.getPasswordStatus(identityId);
    if (!row) {
      throw new IdentityError("Identity not found", 404, "IDENTITY_NOT_FOUND");
    }
    const cred = row.passwordCreds[0];
    const changedAt = cred?.passwordChangedAt ?? null;
    const expired = passwordService.isExpired(changedAt);
    const expiresAt = passwordService.expiresAt(changedAt);

    return {
      hasPassword: !!cred,
      lastChangedAt: changedAt?.toISOString() ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      expired,
      mustChangePassword: row.mustChangePassword || expired,
      mustChangePasswordReason: row.mustChangePasswordReason,
      sessionVersion: row.sessionVersion,
      policy: passwordPolicyService.getClientPolicy(),
    };
  }

  /** Login gate helper */
  async checkLoginPasswordGate(identityId: string): Promise<{
    mustChangePassword: boolean;
    reason: string | null;
    expired: boolean;
  }> {
    const status = await this.getPasswordStatus(identityId);
    if (status.expired && !status.mustChangePassword) {
      await this.expirePassword({ identityId });
    }
    return {
      mustChangePassword: status.mustChangePassword || status.expired,
      reason: status.mustChangePasswordReason || (status.expired ? "password_expired" : null),
      expired: status.expired,
    };
  }
}

export const credentialLifecycleService = new CredentialLifecycleService();
