/**
 * POST /api/auth/password/force-reset
 * Admin: { identityId, reason? }
 * Requires security.manage or users.manage
 */

import { NextResponse } from "next/server";
import {
  credentialLifecycleService,
  requirePermission,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission(req, [
      "security.manage",
      "users.manage",
    ]);
    const body = await req.json().catch(() => ({}));
    const identityId =
      typeof body.identityId === "string" ? body.identityId : "";
    const reason =
      typeof body.reason === "string" ? body.reason : "admin_force_reset";
    if (!identityId) {
      throw new IdentityError("identityId required", 400, "VALIDATION_ERROR");
    }

    await credentialLifecycleService.forcePasswordReset({
      identityId,
      reason,
      actorIdentityId: ctx.identityId,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
