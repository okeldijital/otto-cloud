/**
 * POST /api/auth/refresh — rotate refresh token, issue new access token.
 * Reuse of a rotated token revokes the entire session.
 */

import { NextResponse } from "next/server";
import {
  cookieService,
  sessionService,
  rateLimitService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
  currentIdentityService,
  metaFromRequest,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const cookies = cookieService.readFromRequest(req.headers.get("cookie"));
    if (!cookies.refreshToken) {
      throw new IdentityError(
        "Refresh token required",
        401,
        "REFRESH_TOKEN_REQUIRED"
      );
    }

    rateLimitService.assertRefresh({
      ip: clientIp(req),
    });

    // Prefer org from current context if available
    const existing = await currentIdentityService.resolveFromRequest(
      metaFromRequest(req)
    );

    const rotated = await sessionService.rotateRefreshToken({
      refreshToken: cookies.refreshToken,
      organizationId: existing?.organizationId ?? null,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    // Keep existing session cookie value if present
    const sessionToken = cookies.sessionToken;
    if (!sessionToken) {
      throw new IdentityError("Session cookie missing", 401, "SESSION_REQUIRED");
    }

    const res = NextResponse.json({
      success: true,
      accessExpiresAt: rotated.accessExpiresAt.toISOString(),
      sessionExpiresAt: rotated.sessionExpiresAt.toISOString(),
    });

    cookieService.applyAuthCookies(res, {
      sessionToken,
      refreshToken: rotated.refreshToken,
      accessToken: rotated.accessToken,
      accessMaxAgeSeconds: rotated.accessMaxAgeSeconds,
      sessionMaxAgeSeconds: rotated.sessionMaxAgeSeconds,
      refreshMaxAgeSeconds: rotated.refreshMaxAgeSeconds,
    });

    return res;
  } catch (err) {
    const res = identityErrorResponse(err);
    // On reuse detection, clear cookies
    if (err instanceof IdentityError && err.code === "REFRESH_TOKEN_REUSE") {
      cookieService.clearAuthCookies(res);
    }
    return res;
  }
}
