import { NextResponse } from "next/server";
import {
  identityService,
  membershipService,
  requireAuthentication,
  IdentityError,
} from "@/lib/platform/identity";
import { orgContextErrorResponse } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const members = await membershipService.listMembers(ctx.organizationId);
    return NextResponse.json(members);
  } catch (err) {
    const response = orgContextErrorResponse(err);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const roleKey = typeof body.role_key === "string" && body.role_key.trim()
      ? body.role_key.trim()
      : "member";

    if (!email) {
      throw new IdentityError("Email is required", 400, "VALIDATION_ERROR");
    }

    const identity = await identityService.findByEmail(email);

    if (identity) {
      const membership = await membershipService.createMembership({
        organizationId: ctx.organizationId,
        identityId: identity.id,
        roleKey,
        isDefault: false,
        isOwner: false,
        actorIdentityId: ctx.identityId,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Member added",
          membership,
        },
        { status: 201 }
      );
    }

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
