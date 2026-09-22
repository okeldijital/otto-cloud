/**
 * Organization membership administration.
 *
 * All membership mutations are organization-scoped and re-check role grants
 * on the server. The client never decides whether a role change is allowed.
 */

import { NextResponse } from "next/server";
import {
  organizationService,
  requirePermission,
  requireOrganization,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";
import { assertCanGrantOrgRole } from "@/lib/auth/privilege-authorization";
import { roleRepository } from "@/lib/platform/identity/repositories/RoleRepository";

export async function GET(req: Request) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "users.manage",
      "users.invite",
    ]);
    if (!ctx.organizationId) {
      throw new IdentityError(
        "Organization context required",
        403,
        "ORGANIZATION_REQUIRED"
      );
    }
    const members = await organizationService.listMembers(ctx.organizationId);
    return NextResponse.json({
      members: members.map((m) => ({
        identityId: m.identityId,
        email: m.email,
        displayName: m.displayName,
        membershipStatus: m.status,
        role: m.roleKey,
        roleName: m.roleName,
        isDefault: m.isDefault,
        isOwner: m.isOwner,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "users.manage",
      "users.invite",
    ]);
    const orgCtx = await requireOrganization(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const roleKey = typeof body.roleKey === "string" ? body.roleKey.trim() : "member";

    if (!email) throw new IdentityError("email required", 400, "VALIDATION_ERROR");

    const targetRole = await roleRepository.findByKey(orgCtx.organizationId, roleKey);
    if (!targetRole) throw new IdentityError("Role not found", 404, "ROLE_NOT_FOUND");

    assertCanGrantOrgRole(ctx, roleKey, {
      allowOwner: false,
      targetPermissions: targetRole.permissions.map((p) => p.permission.key),
    });

    const identity = await organizationService.findIdentityByEmail(email);
    if (!identity) {
      throw new IdentityError(
        "Identity not found — invite flow is A.7",
        404,
        "IDENTITY_NOT_FOUND"
      );
    }

    const membership = await organizationService.addMember({
      organizationId: orgCtx.organizationId,
      identityId: identity.id,
      roleKey,
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requirePermission(req, ["organizations.manage", "users.manage"]);
    const orgCtx = await requireOrganization(req);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const identityId = typeof body.identityId === "string" ? body.identityId : "";
    const roleKey = typeof body.roleKey === "string" ? body.roleKey.trim() : "";

    if (!identityId || !roleKey) {
      throw new IdentityError("identityId and roleKey are required", 400, "VALIDATION_ERROR");
    }

    const targetRole = await roleRepository.findByKey(orgCtx.organizationId, roleKey);
    if (!targetRole) throw new IdentityError("Role not found", 404, "ROLE_NOT_FOUND");

    assertCanGrantOrgRole(ctx, roleKey, {
      allowOwner: false,
      targetPermissions: targetRole.permissions.map((p) => p.permission.key),
    });

    const membership = await organizationService.setMemberRole({
      organizationId: orgCtx.organizationId,
      identityId,
      roleKey,
    });

    return NextResponse.json({ membership });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
