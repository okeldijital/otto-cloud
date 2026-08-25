/**
 * MembershipService — membership lifecycle (A.5).
 */

import { IdentityError } from "../domain/types";
import { membershipRepository } from "../repositories/MembershipRepository";
import { roleRepository } from "../repositories/RoleRepository";
import { organizationRepository } from "../repositories/OrganizationRepository";
import { organizationPolicyService } from "./OrganizationPolicyService";
import { effectivePermissionCache } from "../authorization/EffectivePermissionCache";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../authentication/events";
import type { MembershipDto } from "../dto/MembershipDto";

function toDto(m: {
  id: string; identityId: string; organizationId: string; status: string;
  isDefault: boolean; isOwner: boolean; membershipVersion: number;
  joinedAt: Date | null; role?: { key: string; name: string } | null;
  identity?: { email: string; displayName: string | null } | null;
}): MembershipDto {
  return {
    id: m.id, identityId: m.identityId, organizationId: m.organizationId,
    status: m.status, isDefault: m.isDefault, isOwner: m.isOwner,
    roleKey: m.role?.key ?? null, roleName: m.role?.name ?? null,
    membershipVersion: m.membershipVersion, joinedAt: m.joinedAt?.toISOString() ?? null,
    email: m.identity?.email, displayName: m.identity?.displayName,
  };
}

export class MembershipService {
  async listMembers(organizationId: string): Promise<MembershipDto[]> {
    const rows = await membershipRepository.listForOrganization(organizationId);
    return rows.map((m) => toDto(m as any));
  }

  async listForIdentity(identityId: string) { return membershipRepository.listForIdentity(identityId); }

  async createMembership(params: {
    organizationId: string; identityId: string; roleKey?: string;
    isOwner?: boolean; isDefault?: boolean; actorIdentityId?: string | null;
  }): Promise<MembershipDto> {
    await organizationPolicyService.assertNotLocked(params.organizationId);
    const policies = await organizationPolicyService.getPolicies(params.organizationId);
    const count = await membershipRepository.countActive(params.organizationId);
    if (count >= policies.maxMembers) throw new IdentityError("Organization member limit reached", 400, "MEMBER_LIMIT");

    const roleKey = params.roleKey ?? "member";
    if (roleKey === "owner" && !params.isOwner) {
      throw new IdentityError("Owner role can only be assigned through ownership transfer", 403, "OWNER_ROLE_RESTRICTED");
    }
    const role = await roleRepository.findByKey(params.organizationId, roleKey);
    if (!role) throw new IdentityError("Role not found", 404, "ROLE_NOT_FOUND");

    const m = await membershipRepository.upsert({
      identityId: params.identityId, organizationId: params.organizationId,
      roleId: role.id, status: "active", isDefault: params.isDefault ?? false,
      isOwner: params.isOwner ?? false,
    });
    await membershipRepository.audit({ organizationId: params.organizationId, membershipId: m.id, identityId: params.identityId, actorIdentityId: params.actorIdentityId, action: "created", payload: { roleKey } });
    effectivePermissionCache.invalidatePrefix(params.identityId, params.organizationId);
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.MembershipCreated, identityId: params.identityId, organizationId: params.organizationId, payload: { membershipId: m.id, roleKey } });
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.RoleAssigned, identityId: params.identityId, organizationId: params.organizationId, payload: { roleKey, membershipId: m.id } });
    return toDto(m as any);
  }

  async setRole(params: { organizationId: string; identityId: string; roleKey: string; actorIdentityId?: string | null }): Promise<MembershipDto> {
    if (params.roleKey === "owner") throw new IdentityError("Owner role can only be assigned through ownership transfer", 403, "OWNER_ROLE_RESTRICTED");
    const membership = await membershipRepository.find(params.identityId, params.organizationId);
    if (!membership || membership.status === "removed") throw new IdentityError("Membership not found", 404, "MEMBERSHIP_NOT_FOUND");
    const role = await roleRepository.findByKey(params.organizationId, params.roleKey);
    if (!role) throw new IdentityError("Role not found", 404, "ROLE_NOT_FOUND");
    const updated = await membershipRepository.setRole(membership.id, role.id);
    await membershipRepository.audit({ organizationId: params.organizationId, membershipId: membership.id, identityId: params.identityId, actorIdentityId: params.actorIdentityId, action: "role_assigned", payload: { roleKey: params.roleKey } });
    effectivePermissionCache.invalidatePrefix(params.identityId, params.organizationId);
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.RoleAssigned, identityId: params.identityId, organizationId: params.organizationId, payload: { roleKey: params.roleKey } });
    return toDto({ ...membership, ...updated, role } as any);
  }

  async suspend(params: { organizationId: string; identityId: string; actorIdentityId?: string | null }): Promise<void> {
    const membership = await membershipRepository.find(params.identityId, params.organizationId);
    if (!membership) throw new IdentityError("Membership not found", 404, "MEMBERSHIP_NOT_FOUND");
    if (membership.isOwner) throw new IdentityError("Cannot suspend organization owner", 400, "CANNOT_SUSPEND_OWNER");
    await membershipRepository.updateStatus(membership.id, "suspended", { suspendedAt: new Date() });
    await membershipRepository.audit({ organizationId: params.organizationId, membershipId: membership.id, identityId: params.identityId, actorIdentityId: params.actorIdentityId, action: "suspended" });
    effectivePermissionCache.invalidatePrefix(params.identityId, params.organizationId);
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.MembershipSuspended, identityId: params.identityId, organizationId: params.organizationId, payload: { membershipId: membership.id } });
  }

  async reactivate(params: { organizationId: string; identityId: string; actorIdentityId?: string | null }): Promise<void> {
    const membership = await membershipRepository.find(params.identityId, params.organizationId);
    if (!membership) throw new IdentityError("Membership not found", 404, "MEMBERSHIP_NOT_FOUND");
    await membershipRepository.updateStatus(membership.id, "active", { suspendedAt: null });
    await membershipRepository.audit({ organizationId: params.organizationId, membershipId: membership.id, identityId: params.identityId, actorIdentityId: params.actorIdentityId, action: "reactivated" });
    effectivePermissionCache.invalidatePrefix(params.identityId, params.organizationId);
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.MembershipReactivated, identityId: params.identityId, organizationId: params.organizationId, payload: { membershipId: membership.id } });
  }

  async remove(params: { organizationId: string; identityId: string; actorIdentityId?: string | null }): Promise<void> {
    const membership = await membershipRepository.find(params.identityId, params.organizationId);
    if (!membership) throw new IdentityError("Membership not found", 404, "MEMBERSHIP_NOT_FOUND");
    if (membership.isOwner) throw new IdentityError("Transfer ownership before removing owner", 400, "CANNOT_REMOVE_OWNER");
    await membershipRepository.updateStatus(membership.id, "removed", { removedAt: new Date() });
    await membershipRepository.audit({ organizationId: params.organizationId, membershipId: membership.id, identityId: params.identityId, actorIdentityId: params.actorIdentityId, action: "removed" });
    effectivePermissionCache.invalidatePrefix(params.identityId, params.organizationId);
    await emitIdentityEvent({ eventType: IDENTITY_EVENTS.MembershipRemoved, identityId: params.identityId, organizationId: params.organizationId, payload: { membershipId: membership.id } });
  }

  async transferOwnership(params: { organizationId: string; newOwnerIdentityId: string; actorIdentityId: string }): Promise<void> {
    const org = await organizationRepository.findById(params.organizationId);
    if (!org) throw new IdentityError("Organization not found", 404, "ORG_NOT_FOUND");
    const newOwner = await membershipRepository.find(params.newOwnerIdentityId, params.organizationId);
    if (!newOwner || newOwner.status !== "active") throw new IdentityError("New owner must be an active member", 400, "INVALID_OWNER");
    if (org.ownerIdentityId) {
      const prev = await membershipRepository.find(org.ownerIdentityId, params.organizationId);
      if (prev) await membershipRepository.upsert({ identityId: prev.identityId, organizationId: params.organizationId, roleId: prev.roleId, isOwner: false, status: "active" });
    }
    const ownerRole = (await roleRepository.findByKey(params.organizationId, "owner")) || (await roleRepository.findByKey(params.organizationId, "org_admin"));
    await organizationRepository.update(params.organizationId, { ownerIdentityId: params.newOwnerIdentityId });
    await membershipRepository.upsert({ identityId: params.newOwnerIdentityId, organizationId: params.organizationId, roleId: ownerRole?.id ?? newOwner.roleId, isOwner: true, status: "active" });
    await membershipRepository.audit({ organizationId: params.organizationId, identityId: params.newOwnerIdentityId, actorIdentityId: params.actorIdentityId, action: "ownership_transferred", payload: { previousOwnerId: org.ownerIdentityId } });
    effectivePermissionCache.invalidatePrefix(params.newOwnerIdentityId);
    if (org.ownerIdentityId) effectivePermissionCache.invalidatePrefix(org.ownerIdentityId);
  }
}

export const membershipService = new MembershipService();
