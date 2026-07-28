/**
 * POST /api/auth/mfa/enroll — begin TOTP enrollment
 * POST /api/auth/mfa/enroll/confirm via confirm route
 */

import { NextResponse } from "next/server";
import {
  mfaService,
  requireAuthentication,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const result = await mfaService.beginEnrollment({
      identityId: ctx.identityId,
      email: ctx.email,
    });
    return NextResponse.json({
      secret: result.secret,
      otpauthUrl: result.otpauthUrl,
      credentialId: result.credentialId,
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
