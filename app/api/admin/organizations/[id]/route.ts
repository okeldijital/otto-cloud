/**
 * GET / PATCH / DELETE /api/admin/organizations/:id
 * Path id must match session org unless platform authority (A8-012).
 */

import { NextResponse } from "next/server";
import {
  organizationService,
  requirePermission,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";
import { assertAdminOrganizationPath } from "@/lib/platform/identity/middleware/assert-org-scope";
import { isPlatformAuthority } from "@/lib/auth/privilege-authorization";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "users.manage",
    ]);
    const { id } = await params;
    assertAdminOrganizationPath(ctx, id);
    const org = await organizationService.get(id);
    return NextResponse.json({ organization: org });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "security.manage",
    ]);
    const { id } = await params;
    assertAdminOrganizationPath(ctx, id);
    const body = await req.json().catch(() => ({}));
    const org = await organizationService.update(
      id,
      {
        name: typeof body.name === "string" ? body.name : undefined,
        mfaPolicy:
          typeof body.mfaPolicy === "string" ? body.mfaPolicy : undefined,
        policies:
          body.policies && typeof body.policies === "object"
            ? body.policies
            : undefined,
      },
      ctx.identityId
    );
    return NextResponse.json({ organization: org });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "platform.admin",
    ]);
    const { id } = await params;
    // Archive always requires platform authority (cross-org destructive)
    if (!isPlatformAuthority(ctx)) {
      throw new IdentityError(
        "Platform authority required to archive organizations",
        403,
        "PLATFORM_AUTHORITY_REQUIRED"
      );
    }
    await organizationService.archive(id, ctx.identityId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
