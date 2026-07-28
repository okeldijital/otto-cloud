/**
 * DELETE /api/auth/mfa/trusted-devices/:id
 */

import { NextResponse } from "next/server";
import {
  mfaService,
  requireAuthentication,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthentication(req);
    const { id } = await params;
    await mfaService.revokeTrustedDevice({
      identityId: ctx.identityId,
      trustedDeviceId: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
