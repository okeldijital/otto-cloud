/**
 * POST /api/auth/invitations/accept
 * { token, password?, displayName? }
 */

import { NextResponse } from "next/server";
import {
  invitationService,
  currentIdentityService,
  identityErrorResponse,
  metaFromRequest,
  IdentityError,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) {
      throw new IdentityError("token required", 400, "VALIDATION_ERROR");
    }
    const ctx = await currentIdentityService.resolveFromRequest(
      metaFromRequest(req)
    );
    const result = await invitationService.accept({
      token,
      identityId: ctx?.identityId,
      password: typeof body.password === "string" ? body.password : undefined,
      displayName:
        typeof body.displayName === "string" ? body.displayName : undefined,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
