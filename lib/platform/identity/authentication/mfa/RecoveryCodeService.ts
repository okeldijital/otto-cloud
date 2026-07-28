/**
 * RecoveryCodeService — single-use hashed recovery codes (A.4).
 */

import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/platform/config";
import { generateSecureToken, hashToken } from "../crypto/tokens";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../events";

export class RecoveryCodeService {
  private count(): number {
    return getPlatformConfig().security.mfa.recoveryCodeCount;
  }

  async remaining(identityId: string): Promise<number> {
    return prisma.iamRecoveryCode.count({
      where: { identityId, usedAt: null },
    });
  }

  /**
   * Generate new codes; invalidates previous unused codes.
   * Returns plaintext codes once — never stored.
   */
  async regenerate(
    identityId: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<string[]> {
    await prisma.iamRecoveryCode.deleteMany({
      where: { identityId },
    });

    const codes: string[] = [];
    const n = this.count();
    for (let i = 0; i < n; i++) {
      // Format: XXXX-XXXX-XXXX style-ish base32
      const code = generateSecureToken(9).toUpperCase().replace(/[^A-Z2-7]/g, "").slice(0, 12);
      const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
      codes.push(formatted);
      await prisma.iamRecoveryCode.create({
        data: {
          identityId,
          codeHash: hashToken(formatted.replace(/-/g, "").toUpperCase()),
        },
      });
    }

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaRecoveryRegenerated,
      identityId,
      payload: { count: codes.length },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return codes;
  }

  /** Consume a recovery code (single-use). Returns true if valid. */
  async consume(
    identityId: string,
    code: string,
    meta?: { ipAddress?: string | null; userAgent?: string | null }
  ): Promise<boolean> {
    const normalized = (code || "").replace(/[\s-]/g, "").toUpperCase();
    if (normalized.length < 8) return false;
    const hash = hashToken(normalized);
    const row = await prisma.iamRecoveryCode.findFirst({
      where: { identityId, codeHash: hash, usedAt: null },
    });
    if (!row) return false;

    // Replay protection
    await prisma.iamRecoveryCode.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.MfaRecoveryUsed,
      identityId,
      payload: { recoveryCodeId: row.id },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return true;
  }
}

export const recoveryCodeService = new RecoveryCodeService();
