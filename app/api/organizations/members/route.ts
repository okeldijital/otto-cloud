import { NextResponse } from "next/server";
import {
  identityService,
  membershipService,
  requireOrganization,
  IdentityError,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization(req);
    const members = await membershipService.listMembers(ctx.organizationId);
    return NextResponse.json(members);
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireOrganization(req);
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
        { success: true, message: "Member added", membership },
        { status: 201 }
      );
    }

    throw new IdentityError(
      "No OTTO account exists for this email. Use an invitation to add a new user.",
      404,
      "IDENTITY_NOT_FOUND"
    );
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireOrganization(req);
    const body = await req.json().catch(() => ({}));
    const identityId = typeof body.identity_id === "string" ? body.identity_id : "";
    const roleKey = typeof body.role_key === "string" ? body.role_key.trim() : "";

    if (!identityId || !roleKey) {
      throw new IdentityError(
        "identity_id and role_key are required",
        400,
        "VALIDATION_ERROR"
      );
    }

    const membership = await membershipService.setRole({
      organizationId: ctx.organizationId,
      identityId,
      roleKey,
      actorIdentityId: ctx.identityId,
    });

    return NextResponse.json({ success: true, membership });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrganization(req);
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
    return identityErrorResponse(err);
  }
}
