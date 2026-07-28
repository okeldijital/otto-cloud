/**
 * GET /api/auth/mfa/status
 */

import { NextResponse } from "next/server";
import {
  mfaService,
  requireAuthentication,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const enabled = await mfaService.isEnabled(ctx.identityId);
    return NextResponse.json({ enabled });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
