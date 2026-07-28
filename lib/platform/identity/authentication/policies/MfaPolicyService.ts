/**
 * MfaPolicyService — platform + organization MFA requirements (A.4).
 */

import {
  getPlatformConfig,
  type MfaPolicyConfig,
} from "@/lib/platform/config";
import type { OrgMfaPolicyMode } from "@/lib/platform/config/security/mfa-policy";
import { mfaRepository } from "../repositories/MfaRepository";

export class MfaPolicyService {
  getPlatformPolicy(): MfaPolicyConfig {
    return getPlatformConfig().security.mfa;
  }

  /**
   * Whether MFA challenge is required after password for this identity/org.
   * User must have MFA enrolled if required; if required but not enrolled,
   * login still proceeds but status can surface force-enroll later.
   */
  async isMfaRequiredForLogin(params: {
    identityId: string;
    organizationId?: string | null;
    roles?: string[];
    mfaEnrolled: boolean;
  }): Promise<{ required: boolean; orgMode: string; reason: string | null }> {
    const platform = this.getPlatformPolicy();
    let orgMode: OrgMfaPolicyMode = platform.defaultOrgMode;

    if (params.organizationId) {
      const org = await mfaRepository.getOrgMfaPolicy(params.organizationId);
      if (org?.mfaPolicy) {
        orgMode = org.mfaPolicy as OrgMfaPolicyMode;
      }
    }

    const roles = params.roles ?? [];
    const isAdmin =
      roles.includes("org_admin") ||
      roles.includes("platform_admin") ||
      roles.includes("super_admin") ||
      roles.includes("admin");
    const isOwner = roles.includes("org_admin") || roles.includes("owner");

    if (orgMode === "disabled") {
      // Still honor if user has MFA enrolled (optional hardening)
      return {
        required: params.mfaEnrolled,
        orgMode,
        reason: params.mfaEnrolled ? "user_enrolled" : null,
      };
    }

    if (orgMode === "required_all") {
      return {
        required: true,
        orgMode,
        reason: "org_required_all",
      };
    }

    if (orgMode === "required_admins" || platform.requiredForAdmins) {
      if (isAdmin) {
        return { required: true, orgMode, reason: "admin_required" };
      }
    }

    if (orgMode === "required_owners" && isOwner) {
      return { required: true, orgMode, reason: "owner_required" };
    }

    // optional — required only if user enrolled
    return {
      required: params.mfaEnrolled,
      orgMode,
      reason: params.mfaEnrolled ? "user_enrolled" : null,
    };
  }
}

export const mfaPolicyService = new MfaPolicyService();
