/**
 * Platform SDK — MFA (IAM v1.0)
 */

export {
  mfaService,
  MfaService,
} from "@/lib/platform/identity/authentication/mfa/MfaService";

export {
  mfaChallengeService,
  MfaChallengeService,
} from "@/lib/platform/identity/authentication/mfa/MfaChallengeService";

export type {
  MfaStatusDto,
  MfaEnrollStartDto,
  TrustedDeviceDto,
} from "@/lib/platform/identity/contracts";
