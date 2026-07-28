/**
 * DELETE /api/admin/invitations/:id — cancel invitation
 */

import { NextResponse } from "next/server";
import {
  invitationService,
  requirePermission,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, ["users.invite", "users.manage"]);
    const { id } = await params;
    await invitationService.cancel({
      invitationId: id,
      actorIdentityId: ctx.identityId,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
