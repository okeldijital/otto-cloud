/**
 * POST /api/auth/mfa/disable { code }
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
    const code = typeof body.code === "string" ? body.code : "";
    if (!code) {
      throw new IdentityError("code required", 400, "VALIDATION_ERROR");
    }
    await mfaService.disable({
      identityId: ctx.identityId,
      code,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
