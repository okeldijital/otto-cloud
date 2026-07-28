/**
 * POST /api/auth/change-password
 * { currentPassword, newPassword }
 */

import { NextResponse } from "next/server";
import {
  credentialLifecycleService,
  requireAuthentication,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const body = await req.json().catch(() => ({}));
    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      throw new IdentityError(
        "currentPassword and newPassword required",
        400,
        "VALIDATION_ERROR"
      );
    }

    const result = await credentialLifecycleService.changePassword({
      identityId: ctx.identityId,
      currentPassword,
      newPassword,
      currentSessionId: ctx.sessionId,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    return NextResponse.json({
      success: true,
      sessionVersion: result.sessionVersion,
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
