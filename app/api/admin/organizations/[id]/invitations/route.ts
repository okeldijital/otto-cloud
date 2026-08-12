/**
 * GET / POST /api/admin/organizations/:id/invitations
 */

import { NextResponse } from "next/server";
import {
  invitationService,
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
    const ctx = await requirePermission(req, ["users.invite", "users.manage"]);
    const { id } = await params;
    assertAdminOrganizationPath(ctx, id);
    const invitations = await invitationService.list(id);
    return NextResponse.json({ invitations });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, ["users.invite", "users.manage"]);
    const { id } = await params;
    assertAdminOrganizationPath(ctx, id);
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    if (!email) {
      throw new IdentityError("email required", 400, "VALIDATION_ERROR");
    }
    const roleKey =
      typeof body.roleKey === "string" ? body.roleKey : "member";
    assertCanGrantOrgRole(ctx, roleKey);

    const result = await invitationService.create({
      organizationId: id,
      email,
      roleKey,
      invitedById: ctx.identityId,
    });
    return NextResponse.json(
      {
        invitation: result.invitation,
        ...(process.env.NODE_ENV !== "production"
          ? { inviteUrl: result.inviteUrl }
          : {}),
      },
      { status: 201 }
    );
  } catch (err) {
    return identityErrorResponse(err);
  }
}
