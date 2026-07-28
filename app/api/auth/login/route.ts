/**
 * POST /api/auth/login — IAM native authentication (A.1).
 *
 * Dual-run: if identity is only on legacy User table, returns LEGACY_AUTH_REQUIRED
 * so the client can fall back to next-auth without mixing session sources.
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

    // Dual-run: IAM identities authenticate here; legacy-only users get
    // LEGACY_AUTH_REQUIRED from AuthenticationService for next-auth fallback.
    const result = await authenticationService.login({
      email,
      password,
      rememberMe,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    const res = NextResponse.json({
      identity: result.identity,
      organization: result.organization,
      permissions: result.permissions,
      roles: result.roles,
      requiresMfa: result.requiresMfa,
      requiresEmailVerification: result.requiresEmailVerification,
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

    return res;
  } catch (err) {
    return identityErrorResponse(err);
  }
}
