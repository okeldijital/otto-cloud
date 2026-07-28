/**
 * GET  /api/admin/organizations
 * POST /api/admin/organizations
 */

import { NextResponse } from "next/server";
import {
  organizationService,
  requirePermission,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    await requirePermission(req, [
      "organizations.manage",
      "platform.admin",
      "users.manage",
    ]);
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
