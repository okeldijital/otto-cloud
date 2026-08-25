import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import {
  identityService,
  membershipService,
  organizationPolicyService,
  requireAuthentication,
  IdentityError,
} from "@/lib/platform/identity";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const members = await membershipService.listMembers(ctx.organizationId);
    return NextResponse.json(members);
  } catch (err) {
    return NextResponse.json(
      orgContextErrorResponse(err).body,
      { status: orgContextErrorResponse(err).status }
    );
  }
}

export async function POST(req: Request) {
  try {
    const reqContext = await requireAuthentication(req);
    const ctx = await requireOrganization();
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const roleKey = typeof body.role_key === "string" && body.role_key.trim()
      ? body.role_key.trim()
      : "member";

    if (!email) {
      throw new IdentityError("Email is required", 400, "VALIDATION_ERROR");
    }

    const identity = await identityService.findByEmail(email);

    // Existing OTTO identity: create an IAM-native membership. This is the
    // canonical path for adding an existing user to another organisation.
    if (identity) {
      const membership = await membershipService.createMembership({
        organizationId: ctx.organizationId,
        identityId: identity.id,
        roleKey,
        isDefault: false,
        isOwner: false,
        actorIdentityId: reqContext.identityId,
      });

      return NextResponse.json({
        success: true,
        message: "Member added",
        membership,
      }, { status: 201 });
    }

    // New identities must use the invitation workflow. Do not create a legacy
    // tenant membership here; invitation delivery/acceptance is handled by
    // the IAM invitation flow in the next RRM-003 increment.
    throw new IdentityError(
      "No OTTO account exists for this email. Use an invitation to add a new user.",
      404,
      "IDENTITY_NOT_FOUND"
    );
  } catch (err) {
    const response = orgContextErrorResponse(err);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const { searchParams } = new URL(req.url);
    const identityId = searchParams.get("identity_id");

    if (!identityId) {
      throw new IdentityError("identity_id is required", 400, "VALIDATION_ERROR");
    }

    await membershipService.remove({
      organizationId: ctx.organizationId,
      identityId,
      actorIdentityId: ctx.identityId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const response = orgContextErrorResponse(err);
    return NextResponse.json(response.body, { status: response.status });
  }
}
