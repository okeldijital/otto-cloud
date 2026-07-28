/**
 * POST /api/auth/logout-all
 * Body: { forceAll?: boolean } — forceAll revokes current too
 */

import { NextResponse } from "next/server";
import {
  sessionService,
  requireAuthentication,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  cookieService,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const body = await req.json().catch(() => ({}));
    const forceAll = Boolean(body.forceAll);

    const result = await sessionService.logoutAll({
      identityId: ctx.identityId,
      currentSessionId: ctx.sessionId,
      forceAll,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    const res = NextResponse.json({
      success: true,
      revoked: result.revoked,
      sessionVersion: result.sessionVersion,
      keptCurrent: result.keptCurrent,
    });

    if (forceAll || !result.keptCurrent) {
      cookieService.clearAuthCookies(res);
    }

    return res;
  } catch (err) {
    return identityErrorResponse(err);
  }
}
