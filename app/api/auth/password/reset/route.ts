/**
 * POST /api/auth/password/reset
 * { token, newPassword }
 */

import { NextResponse } from "next/server";
import {
  passwordService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";
    if (!token || !newPassword) {
      throw new IdentityError(
        "token and newPassword required",
        400,
        "VALIDATION_ERROR"
      );
    }
    const result = await passwordService.completeReset({
      token,
      newPassword,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });
    return NextResponse.json({ success: true, identityId: result.identityId });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
