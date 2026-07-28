/**
 * MfaChallengeService — post-password MFA challenge lifecycle (A.4).
 * Session is NOT created until challenge completes successfully.
 */

import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../../domain/types";
import { generateSecureToken, hashToken } from "../crypto/tokens";
import { mfaRepository } from "../repositories/MfaRepository";
import { totpService } from "./TotpService";
import { recoveryCodeService } from "./RecoveryCodeService";
import { rateLimitService } from "../rate-limit/rate-limit-service";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";
import type { MfaChallengeDto } from "../dto/MfaDto";

export class MfaChallengeService {
  async create(params: {
    identityId: string;
    rememberMe?: boolean;
    organizationId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<MfaChallengeDto> {
    const policy = getPlatformConfig().security.mfa;
    const raw = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + policy.challengeTtlSeconds * 1000);

    const row = await mfaRepository.createChallenge({
      identityId: params.identityId,
      challengeTokenHash: hashToken(raw),
      maxAttempts: policy.challengeMaxAttempts,
      rememberMe: params.rememberMe ?? false,
      organizationId: params.organizationId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt,
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaChallengeCreated,
      identityId: params.identityId,
      organizationId: params.organizationId,
      payload: {
        challengeId: row.id,
        expiresAt: expiresAt.toISOString(),
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      challengeId: row.id,
      mfaToken: raw,
      expiresAt: expiresAt.toISOString(),
      methods: ["totp", "recovery"],
    };
  }

  async verify(params: {
    mfaToken: string;
    code: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{
    identityId: string;
    rememberMe: boolean;
    organizationId: string | null;
    method: "totp" | "recovery";
  }> {
    const challenge = await mfaRepository.findChallengeByTokenHash(
      hashToken(params.mfaToken)
    );
    if (!challenge) {
      throw new IdentityError(
        "Invalid MFA challenge",
        401,
        "INVALID_MFA_CHALLENGE"
      );
    }

    if (challenge.status !== "pending") {
      throw new IdentityError(
        "MFA challenge is no longer valid",
        401,
        "MFA_CHALLENGE_INVALID"
      );
    }

    if (challenge.expiresAt <= new Date()) {
      await mfaRepository.expireChallenge(challenge.id);
      throw new IdentityError(
        "MFA challenge expired",
        401,
        "MFA_CHALLENGE_EXPIRED"
      );
    }

    rateLimitService.assertMfa({
      identityId: challenge.identityId,
      ip: params.ipAddress,
    });

    const code = (params.code || "").trim();
    let method: "totp" | "recovery" | null = null;

    // Recovery codes are longer / contain dashes
    if (code.replace(/[\s-]/g, "").length > 6) {
      const used = await recoveryCodeService.consume(
        challenge.identityId,
        code,
        { ipAddress: params.ipAddress, userAgent: params.userAgent }
      );
      if (used) method = "recovery";
    }

    if (!method) {
      const cred = await mfaRepository.findEnabledCredential(
        challenge.identityId
      );
      if (cred) {
        const secret = totpService.decryptSecret(
          cred.secretEncrypted,
          cred.keyVersion
        );
        if (totpService.verify(secret, code)) {
          method = "totp";
          await mfaRepository.touchCredential(cred.id);
        }
      }
    }

    if (!method) {
      const updated = await mfaRepository.incrementAttempt(challenge.id);
      await emitIdentityEvent({
        eventType: IDENTITY_EVENTS.MfaChallengeFailed,
        identityId: challenge.identityId,
        payload: {
          challengeId: challenge.id,
          attemptCount: updated.attemptCount,
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });

      if (updated.attemptCount >= challenge.maxAttempts) {
        await mfaRepository.failChallenge(challenge.id);
        throw new IdentityError(
          "Too many MFA attempts",
          429,
          "MFA_CHALLENGE_LOCKED"
        );
      }
      throw new IdentityError("Invalid MFA code", 401, "INVALID_MFA_CODE");
    }

    await mfaRepository.completeChallenge(challenge.id);

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaChallengeCompleted,
      identityId: challenge.identityId,
      organizationId: challenge.organizationId,
      payload: {
        challengeId: challenge.id,
        method,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      identityId: challenge.identityId,
      rememberMe: challenge.rememberMe,
      organizationId: challenge.organizationId,
      method,
    };
  }
}

export const mfaChallengeService = new MfaChallengeService();
