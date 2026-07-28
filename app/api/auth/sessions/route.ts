/**
 * GET  /api/auth/sessions — list current identity sessions (A.3)
 * DELETE /api/auth/sessions — revoke all other sessions { all?: true }
 */

import { NextResponse } from "next/server";
import {
  sessionService,
  requireAuthentication,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const sessions = await sessionService.listSessions(ctx.identityId);
    return NextResponse.json({
      sessions: sessions.map((s) => ({
        ...s,
        current: s.id === ctx.sessionId,
      })),
      currentSessionId: ctx.sessionId,
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const body = await req.json().catch(() => ({}));
    const all = Boolean(body.all);

    if (all) {
      await sessionService.revokeAllSessions(
        ctx.identityId,
        "logout_all",
        undefined
      );
    } else {
      await sessionService.revokeAllSessions(
        ctx.identityId,
        "revoke_others",
        ctx.sessionId
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
