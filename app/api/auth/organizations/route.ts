/**
 * GET  /api/auth/organizations — list memberships for current identity
 * POST /api/auth/organizations — create organization
 */

import { NextResponse } from "next/server";
import {
  organizationService,
  membershipService,
  requireAuthentication,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const memberships = await membershipService.listForIdentity(ctx.identityId);
    return NextResponse.json({
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        status: m.organization.status,
        role: m.role?.key ?? null,
        isDefault: m.isDefault,
        isOwner: m.isOwner,
        membershipStatus: m.status,
      })),
      activeOrganizationId: ctx.organizationId,
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name : "";
    const slug = typeof body.slug === "string" ? body.slug : undefined;
    if (!name) {
      throw new IdentityError("name required", 400, "VALIDATION_ERROR");
    }
    const org = await organizationService.createOrganization({
      name,
      slug,
      creatorIdentityId: ctx.identityId,
    });
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
