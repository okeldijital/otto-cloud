/**
 * POST /api/auth/login — IAM native authentication.
 * Session is only created when nextStep is authenticated (or post-MFA).
 */

import { NextResponse } from "next/server";
import {
  authenticationService,
  cookieService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const rememberMe = Boolean(body.rememberMe);

    const cookies = cookieService.readFromRequest(req.headers.get("cookie"));

    const result = await authenticationService.login({
      email,
      password,
      rememberMe,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
      trustedDeviceToken: cookies.trustedDeviceToken,
    });

    const res = NextResponse.json({
      nextStep: result.nextStep,
      identity: result.identity,
      organization: result.organization,
      permissions: result.permissions,
      roles: result.roles,
      requiresMfa: result.requiresMfa,
      challengeId: result.challengeId,
      mfaToken: result.mfaToken,
      mfaExpiresAt: result.mfaExpiresAt,
      rememberMe: result.rememberMe,
      requiresEmailVerification: result.requiresEmailVerification,
      requiresPasswordChange: result.requiresPasswordChange,
      passwordChangeReason: result.passwordChangeReason,
    });

    if (result.session) {
      cookieService.applyAuthCookies(res, {
        sessionToken: result.session.sessionToken,
        refreshToken: result.session.refreshToken,
        accessToken: result.session.accessToken,
        rememberMe,
        accessMaxAgeSeconds: result.session.accessMaxAgeSeconds,
        sessionMaxAgeSeconds: result.session.sessionMaxAgeSeconds,
        refreshMaxAgeSeconds: result.session.refreshMaxAgeSeconds,
      });
    }

    return res;
  } catch (err) {
    return identityErrorResponse(err);
  }
}
