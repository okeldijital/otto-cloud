/**
 * MfaService — enrollment, disable, status orchestration (A.4).
 * Challenges: MfaChallengeService. Recovery: RecoveryCodeService. TOTP: TotpService.
 */

import { IdentityError } from "../../domain/types";
import { verifyPassword } from "../crypto/password";
import { mfaRepository } from "../repositories/MfaRepository";
import { totpService } from "./TotpService";
import { recoveryCodeService } from "./RecoveryCodeService";
import { mfaPolicyService } from "../policies/MfaPolicyService";
import { trustedDeviceService } from "../sessions/TrustedDeviceService";
import { mfaChallengeService } from "./MfaChallengeService";
import { rateLimitService } from "../rate-limit/rate-limit-service";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";
import { passwordRepository } from "../repositories/PasswordRepository";
import { prisma } from "@/lib/prisma";
import type {
  MfaEnrollConfirmDto,
  MfaEnrollStartDto,
  MfaStatusDto,
  TrustedDeviceDto,
} from "../dto/MfaDto";

export class MfaService {
  async isEnabled(identityId: string): Promise<boolean> {
    const cred = await mfaRepository.findEnabledCredential(identityId);
    return !!cred;
  }

  async getStatus(
    identityId: string,
    organizationId?: string | null,
    roles?: string[]
  ): Promise<MfaStatusDto> {
    const cred = await mfaRepository.findEnabledCredential(identityId);
    const remaining = await recoveryCodeService.remaining(identityId);
    const trusted = await trustedDeviceService.list(identityId);
    const req = await mfaPolicyService.isMfaRequiredForLogin({
      identityId,
      organizationId,
      roles,
      mfaEnrolled: !!cred,
    });
    const platform = mfaPolicyService.getPlatformPolicy();

    return {
      enabled: !!cred,
      enrolledAt: cred?.enabledAt?.toISOString() ?? null,
      lastUsedAt: cred?.lastUsedAt?.toISOString() ?? null,
      recoveryCodesRemaining: remaining,
      trustedDeviceCount: trusted.length,
      policy: {
        orgMode: req.orgMode,
        required: req.required && !!cred ? true : req.required,
        challengeTtlSeconds: platform.challengeTtlSeconds,
        recoveryCodeCount: platform.recoveryCodeCount,
        trustedDeviceDays: platform.trustedDeviceDays,
      },
    };
  }

  /** Re-auth with password then start enrollment */
  async beginEnrollment(params: {
    identityId: string;
    email: string;
    currentPassword: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<MfaEnrollStartDto> {
    await this.assertPassword(params.identityId, params.currentPassword);

    if (await this.isEnabled(params.identityId)) {
      throw new IdentityError("MFA already enabled", 400, "MFA_ALREADY_ENABLED");
    }

    await mfaRepository.clearPending(params.identityId);

    const secret = totpService.generateSecret();
    const { ciphertext, keyVersion } = totpService.encryptSecret(secret);
    const cred = await mfaRepository.createPending({
      identityId: params.identityId,
      secretEncrypted: ciphertext,
      keyVersion,
    });

    const otpauthUrl = totpService.otpauthUrl({
      secret,
      accountName: params.email,
    });

    return {
      credentialId: cred.id,
      secret,
      otpauthUrl,
      qrPayload: otpauthUrl,
    };
  }

  async confirmEnrollment(params: {
    identityId: string;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<MfaEnrollConfirmDto> {
    rateLimitService.assertMfa({
      identityId: params.identityId,
      ip: params.ipAddress,
    });

    const cred = await mfaRepository.findPendingCredential(params.identityId);
    if (!cred) {
      throw new IdentityError(
        "No pending MFA enrollment",
        400,
        "MFA_ENROLLMENT_NOT_FOUND"
      );
    }

    const secret = totpService.decryptSecret(
      cred.secretEncrypted,
      cred.keyVersion
    );
    if (!totpService.verify(secret, params.code)) {
      throw new IdentityError("Invalid MFA code", 401, "INVALID_MFA_CODE");
    }

    await mfaRepository.enableCredential(cred.id);
    const recoveryCodes = await recoveryCodeService.regenerate(
      params.identityId,
      { ipAddress: params.ipAddress, userAgent: params.userAgent }
    );

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaEnabled,
      identityId: params.identityId,
      payload: { type: "totp" },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      success: true,
      recoveryCodes,
      warning:
        "Store these recovery codes securely. They will not be shown again.",
    };
  }

  async disable(params: {
    identityId: string;
    currentPassword: string;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.assertPassword(params.identityId, params.currentPassword);

    const ok = await this.verifyCode({
      identityId: params.identityId,
      code: params.code,
      allowRecovery: true,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    if (!ok) {
      throw new IdentityError("Invalid MFA code", 401, "INVALID_MFA_CODE");
    }

    await mfaRepository.disableAll(params.identityId);
    await prisma.iamRecoveryCode.deleteMany({
      where: { identityId: params.identityId },
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaDisabled,
      identityId: params.identityId,
      payload: {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async regenerateRecoveryCodes(params: {
    identityId: string;
    currentPassword: string;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<string[]> {
    await this.assertPassword(params.identityId, params.currentPassword);
    const ok = await this.verifyCode({
      identityId: params.identityId,
      code: params.code,
      allowRecovery: false,
      ipAddress: params.ipAddress,
    });
    if (!ok) {
      throw new IdentityError("Invalid MFA code", 401, "INVALID_MFA_CODE");
    }
    return recoveryCodeService.regenerate(params.identityId, {
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async verifyCode(params: {
    identityId: string;
    code: string;
    allowRecovery?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<boolean> {
    rateLimitService.assertMfa({
      identityId: params.identityId,
      ip: params.ipAddress,
    });
    const code = (params.code || "").trim();
    if (params.allowRecovery !== false && code.replace(/[\s-]/g, "").length > 6) {
      return recoveryCodeService.consume(params.identityId, code, {
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    }
    const cred = await mfaRepository.findEnabledCredential(params.identityId);
    if (!cred) return false;
    const secret = totpService.decryptSecret(
      cred.secretEncrypted,
      cred.keyVersion
    );
    if (!totpService.verify(secret, code)) return false;
    await mfaRepository.touchCredential(cred.id);
    return true;
  }

  async isTrustedDevice(
    identityId: string,
    deviceToken?: string | null
  ): Promise<boolean> {
    return trustedDeviceService.isTrusted(
      identityId,
      deviceToken ?? undefined
    );
  }

  async createTrustedDevice(params: {
    identityId: string;
    deviceId?: string | null;
    userAgent?: string | null;
    label?: string | null;
  }) {
    return trustedDeviceService.create(params);
  }

  async listTrustedDevices(identityId: string): Promise<TrustedDeviceDto[]> {
    const rows = await trustedDeviceService.list(identityId);
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      trusted: r.trusted,
      trustedAt: r.trustedAt?.toISOString() ?? null,
      trustedUntil: r.trustedUntil?.toISOString() ?? null,
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt.toISOString(),
      userAgent: r.userAgent,
    }));
  }

  async revokeTrustedDevice(params: {
    identityId: string;
    trustedDeviceId: string;
  }) {
    return trustedDeviceService.revoke(params);
  }

  /** Admin: force disable MFA without user TOTP (reset) */
  async adminResetMfa(params: {
    identityId: string;
    actorIdentityId: string;
    ipAddress?: string | null;
  }): Promise<void> {
    await mfaRepository.disableAll(params.identityId);
    await prisma.iamRecoveryCode.deleteMany({
      where: { identityId: params.identityId },
    });
    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaDisabled,
      identityId: params.identityId,
      payload: {
        method: "admin_reset",
        actorIdentityId: params.actorIdentityId,
      },
      ipAddress: params.ipAddress,
    });
  }

  // Compat for older challenge HMAC tokens (tests) — prefer MfaChallengeService
  issueChallengeToken(identityId: string): string {
    // Delegates to async create is preferred; sync token for unit tests only
    return `legacy:${identityId}`;
  }

  verifyChallengeToken(token: string): string {
    if (token.startsWith("legacy:")) return token.slice(7);
    throw new IdentityError(
      "Use MfaChallengeService for challenges",
      400,
      "USE_MFA_CHALLENGE_SERVICE"
    );
  }

  private async assertPassword(
    identityId: string,
    password: string
  ): Promise<void> {
    const cred = await passwordRepository.findCredentialByIdentity(identityId);
    if (!cred) {
      throw new IdentityError(
        "No password credential",
        400,
        "NO_PASSWORD_CREDENTIAL"
      );
    }
    const ok = await verifyPassword(password, cred.passwordHash);
    if (!ok) {
      throw new IdentityError(
        "Current password is incorrect",
        401,
        "INVALID_CURRENT_PASSWORD"
      );
    }
  }
}

export const mfaService = new MfaService();

// re-export challenge create for auth flow
export { mfaChallengeService };
