/**
 * GET /api/auth/verify-email?token=...
 * POST /api/auth/verify-email { token }
 */

import { NextResponse } from "next/server";
import {
  emailVerificationService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";

async function verify(token: string, req: Request) {
  if (!token) {
    throw new IdentityError(
      "Verification token required",
      400,
      "VALIDATION_ERROR"
    );
  }
  const result = await emailVerificationService.verifyToken({
    token,
    ipAddress: clientIp(req),
    userAgent: clientUserAgent(req),
  });
  return NextResponse.json({
    success: true,
    identityId: result.identityId,
    email: result.email,
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || "";
    return await verify(token, req);
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    return await verify(token, req);
  } catch (err) {
    return identityErrorResponse(err);
  }
}
