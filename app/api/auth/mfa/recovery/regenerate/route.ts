/**
 * POST /api/auth/mfa/recovery/regenerate
 * { currentPassword, code }
 */

import { NextResponse } from "next/server";
import {
  mfaService,
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
    const code = typeof body.code === "string" ? body.code : "";
    if (!currentPassword || !code) {
      throw new IdentityError(
        "currentPassword and code required",
        400,
        "VALIDATION_ERROR"
      );
    }
    const codes = await mfaService.regenerateRecoveryCodes({
      identityId: ctx.identityId,
      currentPassword,
      code,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });
    return NextResponse.json({
      recoveryCodes: codes,
      warning:
        "Store these recovery codes securely. Previous codes are invalidated.",
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
