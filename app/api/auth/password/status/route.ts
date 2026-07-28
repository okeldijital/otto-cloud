/**
 * GET /api/auth/password/status — current password lifecycle status for UI
 */

import { NextResponse } from "next/server";
import {
  credentialLifecycleService,
  requireAuthentication,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const status = await credentialLifecycleService.getPasswordStatus(
      ctx.identityId
    );
    return NextResponse.json(status);
  } catch (err) {
    return identityErrorResponse(err);
  }
}
