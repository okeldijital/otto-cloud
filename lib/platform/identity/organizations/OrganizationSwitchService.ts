/**
 * OrganizationSwitchService — active org switch without re-auth (A.5).
 */

import { IdentityError } from "../domain/types";
import { membershipRepository } from "../repositories/MembershipRepository";
import { permissionResolver } from "../authorization/PermissionResolver";
import { emitIdentityEvent, IDENTITY_EVENTS } from "../authentication/events";

export class OrganizationSwitchService {
  async switchOrganization(params: {
    identityId: string;
    organizationId: string;
  }) {
    const membership = await membershipRepository.find(
      params.identityId,
      params.organizationId
    );
    if (!membership || membership.status !== "active") {
      throw new IdentityError(
        "Not an active member of organization",
        403,
        "NOT_ORG_MEMBER"
      );
    }
    if (membership.organization.status === "archived") {
      throw new IdentityError(
        "Organization is archived",
        403,
        "ORGANIZATION_ARCHIVED"
      );
    }

    await membershipRepository.clearDefault(params.identityId);
    await membershipRepository.setDefault(membership.id);

    const resolved = await permissionResolver.resolve(
      params.identityId,
      params.organizationId
    );

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.OrganizationSwitched,
      identityId: params.identityId,
      organizationId: params.organizationId,
      payload: {
        membershipId: membership.id,
        roles: resolved.roles,
      },
    });

    return {
      organizationId: params.organizationId,
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        status: membership.organization.status,
      },
      roles: resolved.roles,
      permissions: resolved.permissions,
      membershipId: membership.id,
      isOwner: resolved.isOwner,
    };
  }
}

export const organizationSwitchService = new OrganizationSwitchService();
