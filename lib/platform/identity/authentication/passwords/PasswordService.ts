/**
 * PasswordService — low-level password credential operations (A.2).
 * Prefer CredentialLifecycleService for all product flows.
 */

import { hashPassword, verifyPassword } from "../crypto/password";
import { passwordRepository } from "../repositories/PasswordRepository";
import { passwordValidator } from "./PasswordValidator";
import { passwordHistoryService } from "./PasswordHistoryService";
import { passwordPolicyService } from "../policies/PasswordPolicyService";
import { IdentityError } from "../../domain/types";

export class PasswordService {
  async verifyCurrent(
    identityId: string,
    plain: string
  ): Promise<{ credentialId: string; passwordHash: string }> {
    const cred = await passwordRepository.findCredentialByIdentity(identityId);
    if (!cred) {
      throw new IdentityError(
        "No password credential",
        400,
        "NO_PASSWORD_CREDENTIAL"
      );
    }
    const ok = await verifyPassword(plain, cred.passwordHash);
    if (!ok) {
      throw new IdentityError(
        "Current password is incorrect",
        401,
        "INVALID_CURRENT_PASSWORD"
      );
    }
    return { credentialId: cred.id, passwordHash: cred.passwordHash };
  }

  async assertPolicyAndHistory(params: {
    identityId: string;
    newPassword: string;
    currentHash?: string | null;
  }): Promise<void> {
    passwordValidator.assertValid(params.newPassword);
    await passwordHistoryService.assertNotReused({
      identityId: params.identityId,
      newPassword: params.newPassword,
      currentHash: params.currentHash,
    });
  }

  async assertMinimumAge(passwordChangedAt: Date | null | undefined): Promise<void> {
    const minAge = passwordPolicyService.getPolicy().minimumAgeMinutes;
    if (!minAge || !passwordChangedAt) return;
    const earliest = passwordChangedAt.getTime() + minAge * 60 * 1000;
    if (Date.now() < earliest) {
      throw new IdentityError(
        "Password was changed too recently",
        400,
        "PASSWORD_MIN_AGE",
        [`Wait at least ${minAge} minutes between password changes`]
      );
    }
  }

  isExpired(passwordChangedAt: Date | null | undefined): boolean {
    const days = passwordPolicyService.getPolicy().maximumAgeDays;
    if (!days || days <= 0 || !passwordChangedAt) return false;
    const expiresAt =
      passwordChangedAt.getTime() + days * 24 * 60 * 60 * 1000;
    return Date.now() > expiresAt;
  }

  expiresAt(passwordChangedAt: Date | null | undefined): Date | null {
    const days = passwordPolicyService.getPolicy().maximumAgeDays;
    if (!days || days <= 0 || !passwordChangedAt) return null;
    return new Date(passwordChangedAt.getTime() + days * 24 * 60 * 60 * 1000);
  }

  async hashAndStore(params: {
    identityId: string;
    credentialId?: string | null;
    previousHash?: string | null;
    newPassword: string;
  }): Promise<{ credentialId: string; sessionVersion: number }> {
    const newHash = await hashPassword(params.newPassword);

    let credentialId = params.credentialId ?? null;
    if (credentialId && params.previousHash) {
      await passwordHistoryService.record({
        identityId: params.identityId,
        credentialId,
        previousHash: params.previousHash,
      });
      await passwordRepository.updatePasswordHash({
        credentialId,
        passwordHash: newHash,
      });
    } else if (credentialId) {
      await passwordRepository.updatePasswordHash({
        credentialId,
        passwordHash: newHash,
      });
    } else {
      const created = await passwordRepository.createPasswordCredential({
        identityId: params.identityId,
        passwordHash: newHash,
      });
      credentialId = created.id;
    }

    const sessionVersion = await passwordRepository.incrementSessionVersion(
      params.identityId,
      { clearMustChangePassword: true }
    );

    return { credentialId: credentialId!, sessionVersion };
  }
}

export const passwordService = new PasswordService();
