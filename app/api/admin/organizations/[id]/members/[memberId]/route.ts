/**
 * PATCH / DELETE /api/admin/organizations/:id/members/:memberId
 */

import { NextResponse } from "next/server";
import {
  membershipService,
  requirePermission,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";
import { assertAdminOrganizationPath } from "@/lib/platform/identity/middleware/assert-org-scope";
import {
  assertCanGrantOrgRole,
  isPlatformAuthority,
} from "@/lib/auth/privilege-authorization";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "users.manage",
      "organizations.manage",
      "roles.manage",
    ]);
    const { id, memberId } = await params;
    assertAdminOrganizationPath(ctx, id);
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "suspend") {
      await membershipService.suspend({
        organizationId: id,
        identityId: memberId,
        actorIdentityId: ctx.identityId,
      });
      return NextResponse.json({ success: true, action: "suspend" });
    }
    if (action === "reactivate") {
      await membershipService.reactivate({
        organizationId: id,
        identityId: memberId,
        actorIdentityId: ctx.identityId,
      });
      return NextResponse.json({ success: true, action: "reactivate" });
    }
    if (action === "set_role") {
      const roleKey = typeof body.roleKey === "string" ? body.roleKey : "";
      if (!roleKey) {
        throw new IdentityError("roleKey required", 400, "VALIDATION_ERROR");
      }
      assertCanGrantOrgRole(ctx, roleKey);
      const membership = await membershipService.setRole({
        organizationId: id,
        identityId: memberId,
        roleKey,
        actorIdentityId: ctx.identityId,
      });
      return NextResponse.json({ membership });
    }
    if (action === "transfer_ownership") {
      // Ownership transfer: owner or platform only
      if (!ctx.roles.includes("owner") && !isPlatformAuthority(ctx)) {
        throw new IdentityError(
          "Only the organization owner (or platform authority) can transfer ownership",
          403,
          "ROLE_GRANT_DENIED"
        );
      }
      await membershipService.transferOwnership({
        organizationId: id,
        newOwnerIdentityId: memberId,
        actorIdentityId: ctx.identityId,
      });
      return NextResponse.json({ success: true, action: "transfer_ownership" });
    }

    throw new IdentityError(
      "action must be suspend|reactivate|set_role|transfer_ownership",
      400,
      "VALIDATION_ERROR"
    );
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "users.manage",
      "organizations.manage",
    ]);
    const { id, memberId } = await params;
    assertAdminOrganizationPath(ctx, id);
    await membershipService.remove({
      organizationId: id,
      identityId: memberId,
      actorIdentityId: ctx.identityId,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
