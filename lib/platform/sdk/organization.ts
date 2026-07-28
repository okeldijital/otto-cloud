/**
 * Platform SDK — Organization (IAM v1.0)
 */

export {
  organizationService,
  OrganizationService,
} from "@/lib/platform/identity/organizations/OrganizationService";

export {
  organizationSwitchService,
  OrganizationSwitchService,
} from "@/lib/platform/identity/organizations/OrganizationSwitchService";

export {
  organizationPolicyService,
  OrganizationPolicyService,
} from "@/lib/platform/identity/organizations/OrganizationPolicyService";

export type { OrganizationDto } from "@/lib/platform/identity/contracts";
