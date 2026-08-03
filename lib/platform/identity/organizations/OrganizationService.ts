/**
 * OrganizationService — org CRUD & ownership (A.5).
 */

import { IdentityError } from "../domain/types";
import { organizationRepository } from "../repositories/OrganizationRepository";
import { membershipService } from "./MembershipService";
import { seedOrgSystemRoles } from "../services/permission-seed";
import { identityService } from "../services/identity-service";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../authentication/events";
import type { OrganizationDto } from "../dto/MembershipDto";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function toDto(org: {
  id: string;
  name: string;
  slug: string;
  status: string;
  mfaPolicy: string;
  ownerIdentityId: string | null;
  policies: unknown;
  roleVersion: number;
}): OrganizationDto {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    mfaPolicy: org.mfaPolicy,
    ownerIdentityId: org.ownerIdentityId,
    policies: (org.policies as Record<string, unknown>) || {},
    roleVersion: org.roleVersion,
  };
}

export class OrganizationService {
  async createOrganization(params: {
    name: string;
    slug?: string;
    creatorIdentityId: string;
    legacyTenantId?: string | null;
  }): Promise<OrganizationDto> {
    const name = params.name?.trim();
    if (!name) {
      throw new IdentityError(
        "Organization name required",
        400,
        "VALIDATION_ERROR"
      );
    }
    let slug = params.slug?.trim() || slugify(name);
    if (!slug) slug = `org-${Date.now()}`;
    const existing = await organizationRepository.findBySlug(slug);
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const org = await organizationRepository.create({
      name,
      slug,
      ownerIdentityId: params.creatorIdentityId,
      legacyTenantId: params.legacyTenantId,
    });

    // Seed system roles (batched). Previously sequential upserts over Neon
    // pooler could take minutes and appear as a hang during lab init.
    await seedOrgSystemRoles(org.id);

    await membershipService.createMembership({
      organizationId: org.id,
      identityId: params.creatorIdentityId,
      roleKey: "owner",
      isOwner: true,
      isDefault: true,
      actorIdentityId: params.creatorIdentityId,
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.OrganizationCreated,
      identityId: params.creatorIdentityId,
      organizationId: org.id,
      payload: { name: org.name, slug: org.slug },
    });

    return toDto(org as any);
  }

  async get(id: string): Promise<OrganizationDto> {
    const org = await organizationRepository.findById(id);
    if (!org) {
      throw new IdentityError("Organization not found", 404, "ORG_NOT_FOUND");
    }
    return toDto(org as any);
  }

  async update(
    id: string,
    data: {
      name?: string;
      mfaPolicy?: string;
      policies?: Record<string, unknown>;
    },
    actorIdentityId?: string
  ): Promise<OrganizationDto> {
    const org = await organizationRepository.update(id, {
      name: data.name,
      mfaPolicy: data.mfaPolicy,
      policies: data.policies,
    });
    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.OrganizationUpdated,
      identityId: actorIdentityId,
      organizationId: id,
      payload: data,
    });
    return toDto(org as any);
  }

  async archive(id: string, actorIdentityId?: string): Promise<void> {
    await organizationRepository.update(id, { status: "archived" });
    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.OrganizationArchived,
      identityId: actorIdentityId,
      organizationId: id,
      payload: {},
    });
  }

  async list(params?: { status?: string; limit?: number; offset?: number }) {
    const result = await organizationRepository.list(params);
    return {
      ...result,
      organizations: result.rows.map((o) => toDto(o as any)),
    };
  }

  // Compat helpers used by older auth routes
  async listMemberships(identityId: string) {
    return membershipService.listForIdentity(identityId);
  }

  async listMembers(organizationId: string) {
    return membershipService.listMembers(organizationId);
  }

  async addMember(params: {
    organizationId: string;
    identityId: string;
    roleKey?: string;
  }) {
    return membershipService.createMembership(params);
  }

  async setMemberRole(params: {
    organizationId: string;
    identityId: string;
    roleKey: string;
  }) {
    return membershipService.setRole(params);
  }

  async removeMember(params: {
    organizationId: string;
    identityId: string;
  }) {
    return membershipService.remove(params);
  }

  async setDefaultOrganization(params: {
    identityId: string;
    organizationId: string;
  }) {
    const { organizationSwitchService } = await import(
      "./OrganizationSwitchService"
    );
    return organizationSwitchService.switchOrganization(params);
  }

  async getPermissionsForMembership(
    identityId: string,
    organizationId: string
  ) {
    const { permissionResolver } = await import(
      "../authorization/PermissionResolver"
    );
    const r = await permissionResolver.resolve(identityId, organizationId);
    return { roles: r.roles, permissions: r.permissions };
  }

  async findIdentityByEmail(email: string) {
    return identityService.findByEmail(email);
  }
}

export const organizationService = new OrganizationService();
