/**
 * POST /api/auth/mfa/recovery
 * During login challenge: { mfaToken, code } — uses same verify path semantics
 * Alias for recovery code submission at login (also works via /mfa/verify).
 */

import { NextResponse } from "next/server";
import {
  authenticationService,
  cookieService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";
import { getPlatformConfig } from "@/lib/platform/config";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const mfaToken = typeof body.mfaToken === "string" ? body.mfaToken : "";
    const code = typeof body.code === "string" ? body.code : "";
    const rememberMe = Boolean(body.rememberMe);
    const trustDevice = Boolean(body.trustDevice);

    if (!mfaToken || !code) {
      throw new IdentityError(
        "mfaToken and code required",
        400,
        "VALIDATION_ERROR"
      );
    }

    const result = await authenticationService.completeMfaLogin({
      mfaToken,
      code,
      rememberMe,
      trustDevice,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    if (!result.session) {
      throw new IdentityError("Session not created", 500, "SESSION_ERROR");
    }

    const res = NextResponse.json({
      nextStep: result.nextStep,
      identity: result.identity,
      organization: result.organization,
      method: "recovery",
    });

    cookieService.applyAuthCookies(res, {
      sessionToken: result.session.sessionToken,
      refreshToken: result.session.refreshToken,
      accessToken: result.session.accessToken,
      rememberMe,
      accessMaxAgeSeconds: result.session.accessMaxAgeSeconds,
      sessionMaxAgeSeconds: result.session.sessionMaxAgeSeconds,
      refreshMaxAgeSeconds: result.session.refreshMaxAgeSeconds,
    });

    if (result.trustedDeviceToken) {
      const days = getPlatformConfig().security.mfa.trustedDeviceDays;
      cookieService.setTrustedDeviceCookie(
        res,
        result.trustedDeviceToken,
        days * 24 * 60 * 60
      );
    }

    return res;
  } catch (err) {
    return identityErrorResponse(err);
  }
}
