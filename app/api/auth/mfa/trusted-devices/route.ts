/**
 * GET /api/auth/mfa/trusted-devices
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
    const devices = await mfaService.listTrustedDevices(ctx.identityId);
    return NextResponse.json({ devices });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
