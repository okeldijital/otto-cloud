/**
 * InvitationService — invite lifecycle (A.5).
 */

import { IdentityError } from "../domain/types";
import { invitationRepository } from "../repositories/InvitationRepository";
import { roleRepository } from "../repositories/RoleRepository";
import { membershipService } from "./MembershipService";
import { organizationPolicyService } from "./OrganizationPolicyService";
import { identityService } from "../services/identity-service";
import { generateSecureToken, hashToken, normalizeEmail } from "../authentication/crypto/tokens";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../authentication/events";
import type { InvitationDto } from "../dto/MembershipDto";

export class InvitationService {
  async list(organizationId: string): Promise<InvitationDto[]> {
    const rows = await invitationRepository.listForOrganization(organizationId);
    const roles = await roleRepository.listForOrganization(organizationId);
    return rows.map((r) => ({
      id: r.id, organizationId: r.organizationId, email: r.email,
      status: r.status, roleKey: roles.find((x) => x.id === r.roleId)?.key ?? null,
      expiresAt: r.expiresAt.toISOString(), createdAt: r.createdAt.toISOString(), invitedById: r.invitedById,
    }));
  }

  async create(params: { organizationId: string; email: string; roleKey?: string; invitedById: string }): Promise<{ invitation: InvitationDto; inviteUrl: string; token: string }> {
    await organizationPolicyService.assertNotLocked(params.organizationId);
    const policies = await organizationPolicyService.getPolicies(params.organizationId);
    const email = params.email.trim();
    if (!organizationPolicyService.emailAllowed(policies, email)) {
      throw new IdentityError("Email domain not allowed for this organization", 400, "EMAIL_DOMAIN_NOT_ALLOWED");
    }
    const roleKey = params.roleKey ?? "member";
    if (roleKey === "owner") throw new IdentityError("Owner role cannot be assigned by invitation", 403, "OWNER_ROLE_RESTRICTED");
    const role = await roleRepository.findByKey(params.organizationId, roleKey);
    if (!role) throw new IdentityError("Role not found", 404, "ROLE_NOT_FOUND");

    const raw = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + policies.invitationTtlDays * 24 * 60 * 60 * 1000);
    const inv = await invitationRepository.create({
      organizationId: params.organizationId, email, emailNormalized: normalizeEmail(email),
      roleId: role.id, tokenHash: hashToken(raw), invitedById: params.invitedById, expiresAt,
    });
    const configuredBase = process.env.APP_URL || process.env.NEXT_PUBLIC_URL || process.env.NEXTAUTH_URL;
    const base = (configuredBase || (process.env.NODE_ENV === "production" ? "https://otto.okeldijital.africa" : "http://localhost:3000")).replace(/\/$/, "");
    const inviteUrl = `${base}/auth/invite?token=${encodeURIComponent(raw)}`;
    if (process.env.NODE_ENV !== "production") console.info(`[iam] invitation for ${email}: ${inviteUrl}`);

    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.InvitationCreated, identityId: params.invitedById, organizationId: params.organizationId, payload: { invitationId: inv.id, email } });
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.InvitationSent, identityId: params.invitedById, organizationId: params.organizationId, payload: { invitationId: inv.id, email } });

    return {
      invitation: { id: inv.id, organizationId: inv.organizationId, email: inv.email, status: inv.status, roleKey, expiresAt: inv.expiresAt.toISOString(), createdAt: inv.createdAt.toISOString(), invitedById: inv.invitedById },
      inviteUrl, token: raw,
    };
  }

  async cancel(params: { invitationId: string; actorIdentityId: string }): Promise<void> {
    const inv = await invitationRepository.findById(params.invitationId);
    if (!inv) throw new IdentityError("Invitation not found", 404, "INVITATION_NOT_FOUND");
    if (inv.status !== "pending") throw new IdentityError("Invitation is not pending", 400, "INVITATION_NOT_PENDING");
    await invitationRepository.updateStatus(inv.id, "revoked");
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.InvitationCancelled, identityId: params.actorIdentityId, organizationId: inv.organizationId, payload: { invitationId: inv.id } });
  }

  async accept(params: { token: string; identityId?: string | null; password?: string; displayName?: string }): Promise<{ identityId: string; organizationId: string }> {
    const inv = await invitationRepository.findByTokenHash(hashToken(params.token));
    if (!inv) throw new IdentityError("Invalid invitation", 400, "INVALID_INVITATION");
    if (inv.status !== "pending") throw new IdentityError("Invitation is not pending", 400, "INVITATION_NOT_PENDING");
    if (inv.expiresAt <= new Date()) {
      await invitationRepository.updateStatus(inv.id, "expired");
      await emitIdentityEvent({ eventType: IDENTITY_EVENTS.InvitationExpired, organizationId: inv.organizationId, payload: { invitationId: inv.id } });
      throw new IdentityError("Invitation expired", 400, "INVITATION_EXPIRED");
    }

    let identityId = params.identityId ?? null;
    if (!identityId) {
      const existing = await identityService.findByEmail(inv.email);
      if (existing) identityId = existing.id;
      else {
        if (!params.password) throw new IdentityError("Password required to create identity", 400, "PASSWORD_REQUIRED");
        identityId = (await identityService.createWithPassword({ email: inv.email, password: params.password, displayName: params.displayName })).id;
      }
    }

    const roles = await roleRepository.listForOrganization(inv.organizationId);
    const roleKey = roles.find((r) => r.id === inv.roleId)?.key ?? "member";
    if (roleKey === "owner") throw new IdentityError("Owner role cannot be assigned by invitation", 403, "OWNER_ROLE_RESTRICTED");
    await membershipService.createMembership({ organizationId: inv.organizationId, identityId, roleKey, actorIdentityId: inv.invitedById });
    await invitationRepository.updateStatus(inv.id, "accepted", { acceptedAt: new Date() });
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.InvitationAccepted, identityId, organizationId: inv.organizationId, payload: { invitationId: inv.id } });
    return { identityId, organizationId: inv.organizationId };
  }

  async decline(params: { token: string }): Promise<void> {
    const inv = await invitationRepository.findByTokenHash(hashToken(params.token));
    if (!inv || inv.status !== "pending") throw new IdentityError("Invalid invitation", 400, "INVALID_INVITATION");
    await invitationRepository.updateStatus(inv.id, "revoked");
  }
}

export const invitationService = new InvitationService();
