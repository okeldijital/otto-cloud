/**
 * POST /api/auth/register — create IAM identity with password (Argon2id).
 */

import { NextResponse } from "next/server";
import {
  identityService,
  emailVerificationService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName =
      typeof body.full_name === "string"
        ? body.full_name
        : typeof body.displayName === "string"
          ? body.displayName
          : undefined;

    if (!email || !password) {
      throw new IdentityError(
        "Email and password required",
        400,
        "VALIDATION_ERROR"
      );
    }

    const identity = await identityService.createWithPassword({
      email,
      password,
      displayName,
    });

    // Send verification (dev logs URL)
    try {
      await emailVerificationService.requestVerification({
        identityId: identity.id,
        ipAddress: clientIp(req),
        userAgent: clientUserAgent(req),
      });
    } catch {
      /* non-blocking */
    }

    return NextResponse.json(
      {
        id: identity.id,
        email: identity.email,
        displayName: identity.displayName,
        status: identity.status,
        requiresEmailVerification: true,
        requiresOrganization: true,
        message:
          "Account created. Verify your email, then create or join an organization.",
      },
      { status: 201 }
    );
  } catch (err) {
    return identityErrorResponse(err);
  }
}
