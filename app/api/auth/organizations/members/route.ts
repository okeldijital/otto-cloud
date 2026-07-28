/**
 * GET  /api/auth/organizations/members — list members of active org
 * POST /api/auth/organizations/members — add member { email, roleKey? }
 * Requires organizations.manage or users.manage
 */

import { NextResponse } from "next/server";
import {
  organizationService,
  requirePermission,
  requireOrganization,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";

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
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const roleKey =
      typeof body.roleKey === "string" ? body.roleKey : "member";

    if (!email) {
      throw new IdentityError("email required", 400, "VALIDATION_ERROR");
    }

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
