/**
 * PasswordHistoryService — enforce non-reuse of prior passwords (A.2).
 */

import { verifyPassword } from "../crypto/password";
import { passwordRepository } from "../repositories/PasswordRepository";
import { passwordPolicyService } from "../policies/PasswordPolicyService";
import { IdentityError } from "../../domain/types";

export class PasswordHistoryService {
  async assertNotReused(params: {
    identityId: string;
    newPassword: string;
    /** Current credential hash also treated as "history" for reuse */
    currentHash?: string | null;
  }): Promise<void> {
    const policy = passwordPolicyService.getPolicy();
    if (policy.allowPasswordReuse) return;

    if (params.currentHash) {
      if (await verifyPassword(params.newPassword, params.currentHash)) {
        throw new IdentityError(
          "New password must differ from current password",
          400,
          "PASSWORD_REUSE",
          ["Cannot reuse the current password"]
        );
      }
    }

    const depth = policy.historyDepth;
    if (depth <= 0) return;

    const history = await passwordRepository.listHistory(
      params.identityId,
      depth
    );
    for (const row of history) {
      if (await verifyPassword(params.newPassword, row.passwordHash)) {
        throw new IdentityError(
          "Password was used recently",
          400,
          "PASSWORD_REUSE",
          [`Cannot reuse any of the last ${depth} passwords`]
        );
      }
    }
  }

  async record(params: {
    identityId: string;
    credentialId?: string | null;
    previousHash: string;
  }): Promise<void> {
    await passwordRepository.addHistory({
      identityId: params.identityId,
      credentialId: params.credentialId,
      passwordHash: params.previousHash,
    });
    const depth = passwordPolicyService.historyDepth();
    await passwordRepository.trimHistory(params.identityId, Math.max(depth, 1));
  }
}

export const passwordHistoryService = new PasswordHistoryService();
