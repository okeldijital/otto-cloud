/**
 * POST /api/auth/register — create IAM identity with password (Argon2id)
 * and establish the registering user's initial organization/tenant.
 */

import { NextResponse } from "next/server";
import {
  identityService,
  organizationService,
  emailVerificationService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  IdentityError,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName =
      typeof body.full_name === "string"
        ? body.full_name.trim()
        : typeof body.displayName === "string"
          ? body.displayName.trim()
          : undefined;
    const organizationName =
      typeof body.organization_name === "string"
        ? body.organization_name.trim()
        : "";

    if (!email || !password || !organizationName) {
      throw new IdentityError(
        "Email, password, and organization name required",
        400,
        "VALIDATION_ERROR"
      );
    }

    const identity = await identityService.createWithPassword({
      email,
      password,
      displayName,
    });

    const organization = await organizationService.createOrganization({
      name: organizationName,
      creatorIdentityId: identity.id,
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
        organization,
        requiresEmailVerification: true,
        requiresOrganization: false,
        message:
          "Account created. Verify your email, then sign in to continue.",
      },
      { status: 201 }
    );
  } catch (err) {
    return identityErrorResponse(err);
  }
}
