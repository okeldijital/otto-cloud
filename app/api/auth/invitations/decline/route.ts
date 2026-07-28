/**
 * POST /api/auth/invitations/decline { token }
 */

import { NextResponse } from "next/server";
import {
  invitationService,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    if (!token) {
      throw new IdentityError("token required", 400, "VALIDATION_ERROR");
    }
    await invitationService.decline({ token });
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
