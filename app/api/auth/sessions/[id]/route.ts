/**
 * DELETE /api/auth/sessions/[id] — revoke a specific session
 */

import { NextResponse } from "next/server";
import {
  sessionService,
  requireAuthentication,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
} from "@/lib/platform/identity";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthentication(req);
    const { id } = await params;
    await sessionService.getSessionOwnedBy(id, ctx.identityId);
    await sessionService.revokeSession(id, "user_revoke", {
      identityId: ctx.identityId,
      organizationId: ctx.organizationId,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
