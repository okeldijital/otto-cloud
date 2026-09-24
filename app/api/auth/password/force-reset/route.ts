/**
 * POST /api/auth/password/force-reset
 * Admin: { identityId, reason? }
 * Requires security.manage or users.manage
 */

import { NextResponse } from "next/server";
import {
  credentialLifecycleService,
  requirePermission,
  requireOrganization,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";
import { membershipRepository } from "@/lib/platform/identity/repositories/MembershipRepository";

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission(req, [
      "security.manage",
      "users.manage",
    ]);
    const orgCtx = await requireOrganization(req);
    const body = await req.json().catch(() => ({}));
    const identityId =
      typeof body.identityId === "string" ? body.identityId : "";
    const reason =
      typeof body.reason === "string" ? body.reason : "admin_force_reset";
    if (!identityId) {
      throw new IdentityError("identityId required", 400, "VALIDATION_ERROR");
    }

    const membership = await membershipRepository.find(
      identityId,
      orgCtx.organizationId
    );
    if (!membership || membership.status !== "active") {
      throw new IdentityError(
        "Target user is not an active member of this organization",
        404,
        "MEMBERSHIP_NOT_FOUND"
      );
    }

    await credentialLifecycleService.forcePasswordReset({
      identityId,
      reason,
      actorIdentityId: ctx.identityId,
      organizationId: orgCtx.organizationId,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
