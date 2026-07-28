/**
 * POST /api/auth/organizations/switch { organizationId }
 * Sets default org and re-issues access token with org claim.
 */

import { NextResponse } from "next/server";
import {
  organizationService,
  requireAuthentication,
  identityErrorResponse,
  cookieService,
  tokenService,
  sessionService,
  IdentityError,
} from "@/lib/platform/identity";
import { getPlatformConfig } from "@/lib/platform/config";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const body = await req.json().catch(() => ({}));
    const organizationId =
      typeof body.organizationId === "string" ? body.organizationId : "";
    if (!organizationId) {
      throw new IdentityError(
        "organizationId required",
        400,
        "VALIDATION_ERROR"
      );
    }

    await organizationService.setDefaultOrganization({
      identityId: ctx.identityId,
      organizationId,
    });

    const { roles, permissions } =
      await organizationService.getPermissionsForMembership(
        ctx.identityId,
        organizationId
      );

    const access = tokenService.issueAccessToken({
      identityId: ctx.identityId,
      sessionId: ctx.sessionId,
      organizationId,
    });

    const cookies = cookieService.readFromRequest(req.headers.get("cookie"));
    const res = NextResponse.json({
      success: true,
      organizationId,
      roles,
      permissions,
    });

    if (cookies.sessionToken && cookies.refreshToken) {
      const p = getPlatformConfig().security.session;
      cookieService.applyAuthCookies(res, {
        sessionToken: cookies.sessionToken,
        refreshToken: cookies.refreshToken,
        accessToken: access.token,
        accessMaxAgeSeconds: p.accessTokenMinutes * 60,
        sessionMaxAgeSeconds: Math.floor(
          (ctx.sessionExpiresAt.getTime() - Date.now()) / 1000
        ),
        refreshMaxAgeSeconds: p.refreshTokenDays * 24 * 60 * 60,
      });
    }

    await sessionService.touchActivity(ctx.sessionId);
    return res;
  } catch (err) {
    return identityErrorResponse(err);
  }
}
