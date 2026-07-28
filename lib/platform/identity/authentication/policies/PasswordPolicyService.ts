/**
 * PasswordPolicyService — loads and exposes password policy (A.2).
 */

import {
  getPlatformConfig,
  toClientPasswordPolicy,
  type PasswordPolicyConfig,
} from "@/lib/platform/config";

export class PasswordPolicyService {
  getPolicy(): PasswordPolicyConfig {
    return getPlatformConfig().security.password;
  }

  /** Requirements safe to return to browsers */
  getClientPolicy() {
    return toClientPasswordPolicy(this.getPolicy());
  }

  isExpirationEnabled(): boolean {
    return this.getPolicy().maximumAgeDays > 0;
  }

  historyDepth(): number {
    return this.getPolicy().historyDepth;
  }
}

export const passwordPolicyService = new PasswordPolicyService();
