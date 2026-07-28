/**
 * GET    /api/admin/security/sessions/:id
 * DELETE /api/admin/security/sessions/:id — force revoke
 */

import { NextResponse } from "next/server";
import {
  sessionService,
  requirePermission,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
} from "@/lib/platform/identity";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "security.manage",
      "users.manage",
    ]);
    const { id } = await params;
    const detail = await sessionService.getSessionDetail(
      id,
      ctx.identityId,
      ctx.sessionId,
      { admin: true }
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
    const ctx = await requirePermission(req, [
      "security.manage",
      "users.manage",
    ]);
    const { id } = await params;
    const detail = await sessionService.getSessionDetail(
      id,
      ctx.identityId,
      null,
      { admin: true }
    );
    await sessionService.revokeSession(id, "admin_force_logout", {
      identityId: detail.identityId,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
