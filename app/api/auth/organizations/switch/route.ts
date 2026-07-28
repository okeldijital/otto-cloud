/**
 * POST /api/auth/organizations/switch { organizationId }
 */

import { NextResponse } from "next/server";
import {
  organizationSwitchService,
  requireAuthentication,
  identityErrorResponse,
  cookieService,
  tokenService,
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

    const result = await organizationSwitchService.switchOrganization({
      identityId: ctx.identityId,
      organizationId,
    });

    const access = tokenService.issueAccessToken({
      identityId: ctx.identityId,
      sessionId: ctx.sessionId,
      organizationId,
      sessionVersion: ctx.sessionVersion,
    });

    const cookies = cookieService.readFromRequest(req.headers.get("cookie"));
    const res = NextResponse.json({
      success: true,
      organizationId: result.organizationId,
      organization: result.organization,
      roles: result.roles,
      permissions: result.permissions,
      isOwner: result.isOwner,
    });

    if (cookies.sessionToken && cookies.refreshToken) {
      const p = getPlatformConfig().security.session;
      cookieService.applyAuthCookies(res, {
        sessionToken: cookies.sessionToken,
        refreshToken: cookies.refreshToken,
        accessToken: access.token,
        accessMaxAgeSeconds: p.accessTokenMinutes * 60,
        sessionMaxAgeSeconds: Math.max(
          60,
          Math.floor((ctx.sessionExpiresAt.getTime() - Date.now()) / 1000)
        ),
        refreshMaxAgeSeconds: p.refreshTokenDays * 24 * 60 * 60,
      });
    }

    return res;
  } catch (err) {
    return identityErrorResponse(err);
  }
}
