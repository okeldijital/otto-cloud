/**
 * Session DTOs for API responses (A.3).
 */

export type DeviceSummaryDto = {
  id: string | null;
  name: string | null;
  browser: string | null;
  os: string | null;
  platform: string | null;
  deviceType: string | null;
  trusted: boolean;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
};

export type SessionListItemDto = {
  id: string;
  device: DeviceSummaryDto;
  ipAddress: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  absoluteExpiresAt: string | null;
  rememberMe: boolean;
  current: boolean;
  trusted: boolean;
  revoked: boolean;
  revokeReason: string | null;
  riskLevel: string;
  creationSource: string;
  active: boolean;
};

export type RefreshHistoryItemDto = {
  id: string;
  createdAt: string;
  rotatedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
  replacedBy: string | null;
};

export type SessionAuditItemDto = {
  id: string;
  action: string;
  ipAddress: string | null;
  userAgent: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type SessionDetailDto = SessionListItemDto & {
  identityId: string;
  userAgent: string | null;
  refreshHistory: RefreshHistoryItemDto[];
  auditTrail: SessionAuditItemDto[];
  deviceFull: DeviceSummaryDto | null;
};

export type AuthenticationContextDto = {
  identity: {
    id: string;
    email: string;
    displayName: string | null;
    emailVerified: boolean;
    status: string;
    sessionVersion: number;
    mustChangePassword: boolean;
  };
  session: {
    id: string;
    expiresAt: string;
    riskLevel: string;
    rememberMe: boolean;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  permissions: string[];
  roles: string[];
  device: DeviceSummaryDto | null;
  request: {
    ipAddress: string | null;
    userAgent: string | null;
  };
  policy: {
    idleTimeoutHours: number;
    maxAgeHours: number;
    accessTokenMinutes: number;
  };
};
