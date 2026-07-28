/**
 * POST /api/auth/verify-email/request
 * Authenticated: resend for current identity.
 * Unauthenticated body { email }: request by email (no enumeration).
 */

import { NextResponse } from "next/server";
import {
  emailVerificationService,
  currentIdentityService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  metaFromRequest,
  IdentityError,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ip = clientIp(req);
    const ua = clientUserAgent(req);

    const ctx = await currentIdentityService.resolveFromRequest(
      metaFromRequest(req)
    );

    if (ctx) {
      const result = await emailVerificationService.requestVerification({
        identityId: ctx.identityId,
        ipAddress: ip,
        userAgent: ua,
      });
      return NextResponse.json({
        sent: true,
        // Dev-only aid — never in production responses
        ...(process.env.NODE_ENV !== "production"
          ? { verifyUrl: result.verifyUrl }
          : {}),
      });
    }

    const email = typeof body.email === "string" ? body.email : "";
    if (!email) {
      throw new IdentityError("Email required", 400, "VALIDATION_ERROR");
    }

    await emailVerificationService.requestByEmail({
      email,
      ipAddress: ip,
      userAgent: ua,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
