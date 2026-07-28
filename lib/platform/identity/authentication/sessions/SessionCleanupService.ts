/**
 * SessionCleanupService — expire / archive / purge (A.3).
 * Callable manually; schedule later via platform jobs.
 */

import { sessionPolicyService } from "../policies/SessionPolicyService";
import { sessionRepository } from "../repositories/SessionRepository";
import { sessionService } from "./SessionService";
import { prisma } from "@/lib/prisma";

export type CleanupResult = {
  expired: number;
  idleRevoked: number;
  archived: number;
  refreshPurged: number;
  trustedCleaned: number;
};

export class SessionCleanupService {
  async run(): Promise<CleanupResult> {
    const p = sessionPolicyService.getPolicy();
    const batch = p.cleanupBatchSize;

    let expired = 0;
    const expiredRows = await sessionRepository.findExpiredActive(batch);
    for (const s of expiredRows) {
      await sessionService.revokeSession(s.id, "expired", {
        identityId: s.identityId,
      });
      expired += 1;
    }

    let idleRevoked = 0;
    const idleBefore = new Date(
      Date.now() - p.idleTimeoutHours * 60 * 60 * 1000
    );
    const idleRows = await sessionRepository.findIdleCandidates(
      idleBefore,
      batch
    );
    for (const s of idleRows) {
      await sessionService.revokeSession(s.id, "idle_timeout", {
        identityId: s.identityId,
      });
      idleRevoked += 1;
    }

    const archiveBefore = new Date(
      Date.now() - p.archiveAfterDays * 24 * 60 * 60 * 1000
    );
    const archived = await sessionRepository.archiveOld(archiveBefore, batch);
    const refreshPurged =
      await sessionRepository.deleteExpiredRefreshTokens(batch);

    // Cleanup expired trusted devices
    const trusted = await prisma.iamTrustedDevice.updateMany({
      where: {
        revokedAt: null,
        OR: [
          { expiresAt: { lte: new Date() } },
          { trustedUntil: { lte: new Date() } },
        ],
      },
      data: { revokedAt: new Date(), trusted: false },
    });

    return {
      expired,
      idleRevoked,
      archived,
      refreshPurged,
      trustedCleaned: trusted.count,
    };
  }
}

export const sessionCleanupService = new SessionCleanupService();
