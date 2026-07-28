/**
 * Public IAM contracts (DTOs) — v1.0
 * Business modules must not depend on Prisma models.
 */

export type {
  MembershipDto,
  OrganizationDto,
  InvitationDto,
} from "../dto/MembershipDto";

export type {
  SessionListItemDto,
  SessionDetailDto,
  DeviceSummaryDto,
  AuthenticationContextDto,
} from "../authentication/dto/SessionDto";

export type {
  MfaStatusDto,
  MfaEnrollStartDto,
  MfaEnrollConfirmDto,
  MfaChallengeDto,
  LoginNextStep,
  TrustedDeviceDto,
} from "../authentication/dto/MfaDto";

export type IdentityDto = {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  status: string;
  sessionVersion: number;
  mustChangePassword: boolean;
  createdAt?: string;
};

export type RoleDto = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
};

export type PermissionDto = {
  key: string;
  name: string;
  module: string | null;
  description?: string | null;
};

export type SessionSummaryDto = {
  id: string;
  expiresAt: string;
  riskLevel: string;
  rememberMe: boolean;
};

export type AuthzDecisionDto = {
  allowed: boolean;
  permission: string | string[];
  reason?: string;
};

/** Platform version of this contract surface */
export const IAM_CONTRACT_VERSION = "1.0.0";
