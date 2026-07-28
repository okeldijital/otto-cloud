/**
 * MfaService (A.4) — TOTP enrollment, verification, recovery codes, trusted devices.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../../domain/types";
import { encryptSecret, decryptSecret } from "../crypto/secret-box";
import {
  generateSecureToken,
  hashToken,
} from "../crypto/tokens";
import {
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotp,
} from "./totp";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";
import { rateLimitService } from "../rate-limit/rate-limit-service";

function challengeKey(): string {
  return (
    process.env.IAM_ACCESS_TOKEN_SECRET ||
    process.env.IAM_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    "otto-iam-dev-access-secret"
  );
}

export class MfaService {
  private policy() {
    return getPlatformConfig().security.mfa;
  }

  async isEnabled(identityId: string): Promise<boolean> {
    const cred = await prisma.iamMfaCredential.findFirst({
      where: {
        identityId,
        enabledAt: { not: null },
        disabledAt: null,
      },
    });
    return !!cred;
  }

  /** Start enrollment — returns secret + otpauth URL (confirm with code). */
  async beginEnrollment(params: {
    identityId: string;
    email: string;
  }): Promise<{ secret: string; otpauthUrl: string; credentialId: string }> {
    const existing = await prisma.iamMfaCredential.findFirst({
      where: {
        identityId: params.identityId,
        enabledAt: { not: null },
        disabledAt: null,
      },
    });
    if (existing) {
      throw new IdentityError("MFA already enabled", 400, "MFA_ALREADY_ENABLED");
    }

    // Clear pending enrollments
    await prisma.iamMfaCredential.deleteMany({
      where: {
        identityId: params.identityId,
        enabledAt: null,
      },
    });

    const secret = generateTotpSecret();
    const { ciphertext, keyVersion } = encryptSecret(secret);
    const cred = await prisma.iamMfaCredential.create({
      data: {
        identityId: params.identityId,
        type: "totp",
        secretEncrypted: ciphertext,
        keyVersion,
        label: "Authenticator",
      },
    });

    const issuer = this.policy().totpIssuer;
    return {
      secret,
      otpauthUrl: buildOtpAuthUrl({
        secret,
        accountName: params.email,
        issuer,
      }),
      credentialId: cred.id,
    };
  }

  async confirmEnrollment(params: {
    identityId: string;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ recoveryCodes: string[] }> {
    rateLimitService.assertMfa({
      identityId: params.identityId,
      ip: params.ipAddress,
    });

    const cred = await prisma.iamMfaCredential.findFirst({
      where: {
        identityId: params.identityId,
        enabledAt: null,
        disabledAt: null,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!cred) {
      throw new IdentityError(
        "No pending MFA enrollment",
        400,
        "MFA_ENROLLMENT_NOT_FOUND"
      );
    }

    const secret = decryptSecret(cred.secretEncrypted, cred.keyVersion);
    if (!verifyTotp(secret, params.code)) {
      throw new IdentityError("Invalid MFA code", 401, "INVALID_MFA_CODE");
    }

    await prisma.iamMfaCredential.update({
      where: { id: cred.id },
      data: { enabledAt: new Date(), lastUsedAt: new Date() },
    });

    const recoveryCodes = await this.generateRecoveryCodes(params.identityId);

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaEnabled,
      identityId: params.identityId,
      payload: { type: "totp" },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { recoveryCodes };
  }

  async disable(params: {
    identityId: string;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const ok = await this.verifyCode({
      identityId: params.identityId,
      code: params.code,
      allowRecovery: true,
      ipAddress: params.ipAddress,
    });
    if (!ok) {
      throw new IdentityError("Invalid MFA code", 401, "INVALID_MFA_CODE");
    }

    await prisma.iamMfaCredential.updateMany({
      where: {
        identityId: params.identityId,
        disabledAt: null,
      },
      data: { disabledAt: new Date() },
    });
    await prisma.iamRecoveryCode.deleteMany({
      where: { identityId: params.identityId, usedAt: null },
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaDisabled,
      identityId: params.identityId,
      payload: {},
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async verifyCode(params: {
    identityId: string;
    code: string;
    allowRecovery?: boolean;
    ipAddress?: string | null;
  }): Promise<boolean> {
    rateLimitService.assertMfa({
      identityId: params.identityId,
      ip: params.ipAddress,
    });

    const code = (params.code || "").replace(/\s/g, "");

    // Recovery codes are longer alphanumeric
    if (params.allowRecovery !== false && code.length > 6) {
      const used = await this.consumeRecoveryCode(params.identityId, code);
      if (used) return true;
    }

    const cred = await prisma.iamMfaCredential.findFirst({
      where: {
        identityId: params.identityId,
        enabledAt: { not: null },
        disabledAt: null,
      },
    });
    if (!cred) return false;

    const secret = decryptSecret(cred.secretEncrypted, cred.keyVersion);
    if (!verifyTotp(secret, code)) return false;

    await prisma.iamMfaCredential.update({
      where: { id: cred.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  /** Short-lived signed challenge after password success */
  issueChallengeToken(identityId: string): string {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 5 * 60;
    const body = Buffer.from(
      JSON.stringify({ sub: identityId, typ: "mfa_challenge", iat, exp })
    ).toString("base64url");
    const sig = createHmac("sha256", challengeKey())
      .update(body)
      .digest("base64url");
    return `${body}.${sig}`;
  }

  verifyChallengeToken(token: string): string {
    const parts = token.split(".");
    if (parts.length !== 2) {
      throw new IdentityError(
        "Invalid MFA challenge",
        401,
        "INVALID_MFA_CHALLENGE"
      );
    }
    const [payload, sig] = parts;
    const expected = createHmac("sha256", challengeKey())
      .update(payload)
      .digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new IdentityError(
        "Invalid MFA challenge",
        401,
        "INVALID_MFA_CHALLENGE"
      );
    }
    let claims: { sub: string; typ: string; exp: number };
    try {
      claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
      throw new IdentityError(
        "Invalid MFA challenge",
        401,
        "INVALID_MFA_CHALLENGE"
      );
    }
    if (claims.typ !== "mfa_challenge" || claims.exp < Math.floor(Date.now() / 1000)) {
      throw new IdentityError(
        "MFA challenge expired",
        401,
        "MFA_CHALLENGE_EXPIRED"
      );
    }
    return claims.sub;
  }

  async createTrustedDevice(params: {
    identityId: string;
    userAgent?: string | null;
    label?: string | null;
  }): Promise<{ token: string; expiresAt: Date }> {
    const days = this.policy().trustedDeviceDays;
    const opaque = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await prisma.iamTrustedDevice.create({
      data: {
        identityId: params.identityId,
        deviceTokenHash: hashToken(opaque),
        label: params.label ?? null,
        userAgent: params.userAgent ?? null,
        lastUsedAt: new Date(),
        expiresAt,
      },
    });
    return { token: opaque, expiresAt };
  }

  async isTrustedDevice(
    identityId: string,
    deviceToken: string | undefined
  ): Promise<boolean> {
    if (!deviceToken) return false;
    const row = await prisma.iamTrustedDevice.findUnique({
      where: { deviceTokenHash: hashToken(deviceToken) },
    });
    if (!row || row.identityId !== identityId) return false;
    if (row.revokedAt || row.expiresAt <= new Date()) return false;
    await prisma.iamTrustedDevice.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    });
    return true;
  }

  private async generateRecoveryCodes(identityId: string): Promise<string[]> {
    await prisma.iamRecoveryCode.deleteMany({
      where: { identityId, usedAt: null },
    });
    const count = this.policy().recoveryCodeCount;
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = generateSecureToken(10).toUpperCase().slice(0, 12);
      codes.push(code);
      await prisma.iamRecoveryCode.create({
        data: {
          identityId,
          codeHash: hashToken(code),
        },
      });
    }
    return codes;
  }

  private async consumeRecoveryCode(
    identityId: string,
    code: string
  ): Promise<boolean> {
    const hash = hashToken(code.toUpperCase());
    const row = await prisma.iamRecoveryCode.findFirst({
      where: {
        identityId,
        codeHash: hash,
        usedAt: null,
      },
    });
    if (!row) return false;
    await prisma.iamRecoveryCode.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    return true;
  }
}

export const mfaService = new MfaService();
