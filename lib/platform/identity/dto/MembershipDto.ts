export type MembershipDto = {
  id: string;
  identityId: string;
  organizationId: string;
  status: string;
  isDefault: boolean;
  isOwner: boolean;
  roleKey: string | null;
  roleName: string | null;
  membershipVersion: number;
  joinedAt: string | null;
  email?: string;
  displayName?: string | null;
};

export type OrganizationDto = {
  id: string;
  name: string;
  slug: string;
  status: string;
  mfaPolicy: string;
  ownerIdentityId: string | null;
  policies: Record<string, unknown>;
  roleVersion: number;
};

export type InvitationDto = {
  id: string;
  organizationId: string;
  email: string;
  status: string;
  roleKey: string | null;
  expiresAt: string;
  createdAt: string;
  invitedById: string | null;
};
