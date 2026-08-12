/**
 * GET / POST /api/admin/organizations/:id/members
 */

import { NextResponse } from "next/server";
import {
  membershipService,
  organizationService,
  requirePermission,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";
import { assertAdminOrganizationPath } from "@/lib/platform/identity/middleware/assert-org-scope";
import { assertCanGrantOrgRole } from "@/lib/auth/privilege-authorization";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "users.manage",
      "organizations.manage",
      "users.invite",
    ]);
    const { id } = await params;
    assertAdminOrganizationPath(ctx, id);
    const members = await membershipService.listMembers(id);
    return NextResponse.json({ members });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "users.manage",
      "users.invite",
      "organizations.manage",
    ]);
    const { id } = await params;
    assertAdminOrganizationPath(ctx, id);
    const body = await req.json().catch(() => ({}));
    const identityId =
      typeof body.identityId === "string" ? body.identityId : "";
    const email = typeof body.email === "string" ? body.email : "";
    const roleKey =
      typeof body.roleKey === "string" ? body.roleKey : "member";

    assertCanGrantOrgRole(ctx, roleKey);

    let targetId = identityId;
    if (!targetId && email) {
      const ident = await organizationService.findIdentityByEmail(email);
      if (!ident) {
        throw new IdentityError(
          "Identity not found — use invitations to invite new users",
          404,
          "IDENTITY_NOT_FOUND"
        );
      }
      targetId = ident.id;
    }
    if (!targetId) {
      throw new IdentityError(
        "identityId or email required",
        400,
        "VALIDATION_ERROR"
      );
    }

    const membership = await membershipService.createMembership({
      organizationId: id,
      identityId: targetId,
      roleKey,
      actorIdentityId: ctx.identityId,
    });
    return NextResponse.json({ membership }, { status: 201 });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
