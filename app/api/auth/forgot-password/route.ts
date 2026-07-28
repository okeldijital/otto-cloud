/**
 * POST /api/auth/forgot-password
 * { email } — always returns { sent: true } (no enumeration)
 */

import { NextResponse } from "next/server";
import {
  credentialLifecycleService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const result = await credentialLifecycleService.requestPasswordReset({
      email,
      ipAddress: clientIp(req),
      userAgent: clientUserAgent(req),
    });
    return NextResponse.json(result);
  } catch (err) {
    return identityErrorResponse(err);
  }
}
