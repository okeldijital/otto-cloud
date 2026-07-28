/**
 * POST /api/auth/logout
 * Body: { allSessions?: boolean } — allSessions reserved for A.3 UI (supported server-side).
 */

import { NextResponse } from "next/server";
import {
  authenticationService,
  cookieService,
  currentIdentityService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  metaFromRequest,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const allSessions = Boolean(body.allSessions);

    const ctx = await currentIdentityService.resolveFromRequest(
      metaFromRequest(req)
    );

    if (ctx) {
      await authenticationService.logout({
        sessionId: ctx.sessionId,
        identityId: ctx.identityId,
        organizationId: ctx.organizationId,
        allSessions,
        ipAddress: clientIp(req),
        userAgent: clientUserAgent(req),
      });
    }

    const res = NextResponse.json({ success: true });
    cookieService.clearAuthCookies(res);
    return res;
  } catch (err) {
    // Always clear cookies even on error
    const res = identityErrorResponse(err);
    cookieService.clearAuthCookies(res);
    return res;
  }
}
