/**
 * Organization policy defaults & overrides (A.5).
 */

import { getPlatformConfig } from "@/lib/platform/config";
import { organizationRepository } from "../repositories/OrganizationRepository";

export type OrganizationPolicies = {
  maxMembers: number;
  maxAdministrators: number;
  invitationTtlDays: number;
  requireMfa: boolean;
  allowedEmailDomains: string[];
  locked: boolean;
};

export const DEFAULT_ORG_POLICIES: OrganizationPolicies = {
  maxMembers: 500,
  maxAdministrators: 50,
  invitationTtlDays: 7,
  requireMfa: false,
  allowedEmailDomains: [],
  locked: false,
};

export class OrganizationPolicyService {
  platformDefaults(): OrganizationPolicies {
    const tokens = getPlatformConfig().security.tokens;
    return {
      ...DEFAULT_ORG_POLICIES,
      invitationTtlDays: tokens.invitationTtlDays,
    };
  }

  async getPolicies(organizationId: string): Promise<OrganizationPolicies> {
    const org = await organizationRepository.findById(organizationId);
    const base = this.platformDefaults();
    const raw = (org?.policies as Partial<OrganizationPolicies>) || {};
    return {
      maxMembers: raw.maxMembers ?? base.maxMembers,
      maxAdministrators: raw.maxAdministrators ?? base.maxAdministrators,
      invitationTtlDays: raw.invitationTtlDays ?? base.invitationTtlDays,
      requireMfa: raw.requireMfa ?? base.requireMfa,
      allowedEmailDomains: raw.allowedEmailDomains ?? base.allowedEmailDomains,
      locked: (raw.locked ?? base.locked) || org?.status === "suspended",
    };
  }

  async assertNotLocked(organizationId: string): Promise<void> {
    const p = await this.getPolicies(organizationId);
    if (p.locked) {
      const { IdentityError } = await import("../domain/types");
      throw new IdentityError(
        "Organization is locked",
        403,
        "ORGANIZATION_LOCKED"
      );
    }
  }

  emailAllowed(policies: OrganizationPolicies, email: string): boolean {
    if (!policies.allowedEmailDomains.length) return true;
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return false;
    return policies.allowedEmailDomains
      .map((d) => d.toLowerCase())
      .includes(domain);
  }
}

export const organizationPolicyService = new OrganizationPolicyService();
