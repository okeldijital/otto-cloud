/**
 * Platform SDK — Identity (IAM v1.0)
 */

export {
  identityService,
  IdentityService,
} from "@/lib/platform/identity/services/identity-service";

export {
  currentIdentityService,
  CurrentIdentityService,
  type CurrentIdentityContext,
} from "@/lib/platform/identity/authentication/current-identity-service";

export type { IdentityDto } from "@/lib/platform/identity/contracts";
