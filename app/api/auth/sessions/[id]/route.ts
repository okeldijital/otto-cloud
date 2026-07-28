/**
 * GET    /api/auth/sessions/:id — session details
 * DELETE /api/auth/sessions/:id — revoke session
 */

import { NextResponse } from "next/server";
import {
  sessionService,
  requireAuthentication,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthentication(req);
    const { id } = await params;
    const detail = await sessionService.getSessionDetail(
      id,
      ctx.identityId,
      ctx.sessionId
    );
    return NextResponse.json({ session: detail });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthentication(req);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const confirmCurrent = Boolean(body.confirmCurrent);

    if (id === ctx.sessionId && !confirmCurrent) {
      throw new IdentityError(
        "Confirm to revoke the current session (confirmCurrent: true)",
        400,
        "CONFIRM_CURRENT_SESSION"
      );
    }

    await sessionService.getSessionOwnedBy(id, ctx.identityId);
    await sessionService.revokeSession(id, "user_revoke", {
      identityId: ctx.identityId,
      organizationId: ctx.organizationId,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });

    return NextResponse.json({
      success: true,
      revokedCurrent: id === ctx.sessionId,
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
