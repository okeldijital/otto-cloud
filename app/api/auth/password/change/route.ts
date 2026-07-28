/**
 * POST /api/auth/password/change
 * { currentPassword, newPassword }
 */

import { NextResponse } from "next/server";
import {
  passwordService,
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

    await passwordService.changePassword({
      identityId: ctx.identityId,
      currentPassword,
      newPassword,
      currentSessionId: ctx.sessionId,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    // Keep current session cookies; other sessions revoked server-side
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
