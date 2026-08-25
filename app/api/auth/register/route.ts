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

    try {
      const delivery = await emailVerificationService.requestVerification({
        identityId: identity.id,
        ipAddress: clientIp(req),
        userAgent: clientUserAgent(req),
      });

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
          emailDelivery: { sent: true, channel: "resend" },
        },
        { status: 201 }
      );
    } catch (verificationError) {
      console.error("[AUTH] Verification email delivery failed", {
        identityId: identity.id,
        error:
          verificationError instanceof Error
            ? verificationError.message
            : String(verificationError),
      });

      throw new IdentityError(
        "Your account was created, but we could not send the verification email. Please request a new verification email and try again.",
        502,
        "EMAIL_DELIVERY_FAILED"
      );
    }
  } catch (err) {
    return identityErrorResponse(err);
  }
}
