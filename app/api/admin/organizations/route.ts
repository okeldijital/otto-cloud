/**
 * GET  /api/admin/organizations — platform directory (all orgs)
 * POST /api/admin/organizations — create organization
 */

import { NextResponse } from "next/server";
import {
  organizationService,
  requirePermission,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";
import { assertPlatformOrgDirectory } from "@/lib/platform/identity/middleware/assert-org-scope";
import { isPlatformAuthority } from "@/lib/auth/privilege-authorization";

export async function GET(req: Request) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "platform.admin",
      "users.manage",
    ]);
    // Listing every organization is a platform-level operation
    assertPlatformOrgDirectory(ctx);

    const sp = new URL(req.url).searchParams;
    const result = await organizationService.list({
      status: sp.get("status") || undefined,
      limit: parseInt(sp.get("limit") || "50", 10),
      offset: parseInt(sp.get("offset") || "0", 10),
    });
    return NextResponse.json(result);
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "platform.admin",
    ]);
    // Creating orgs is platform-scoped (not ordinary org-admin self-elevation surface)
    if (!isPlatformAuthority(ctx)) {
      throw new IdentityError(
        "Platform authority required to create organizations",
        403,
        "PLATFORM_AUTHORITY_REQUIRED"
      );
    }
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name : "";
    if (!name) {
      throw new IdentityError("name required", 400, "VALIDATION_ERROR");
    }
    const org = await organizationService.createOrganization({
      name,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      creatorIdentityId: ctx.identityId,
    });
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
