/**
 * POST /api/auth/password/forgot
 * { email }
 */

import { NextResponse } from "next/server";
import {
  passwordService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const result = await passwordService.requestReset({
      email,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });
    return NextResponse.json(result);
  } catch (err) {
    return identityErrorResponse(err);
  }
}
