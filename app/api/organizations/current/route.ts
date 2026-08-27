import { NextResponse } from "next/server";
import {
  organizationService,
  requireOrganization,
  identityErrorResponse,
} from "@/lib/platform/identity";

/**
 * Compatibility adapter for the existing Organization Settings UI.
 *
 * Organisation identity and scope come from the canonical IAM context. The
 * old implementation looked up a legacy tenant row, which could return
 * "Organization not found" even when the authenticated user had a valid IAM
 * organisation membership.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization(req);
    const organization = await organizationService.get(ctx.organizationId);

    return NextResponse.json({
      ...organization,
      display_name: organization.name,
      legal_name: null,
      org_type: null,
      website: null,
      email: null,
      phone: null,
      physical_address: null,
      country: null,
      province_state: null,
      city: null,
      currency: "USD",
      timezone: "UTC",
      tax_number: null,
      registration_number: null,
      organizationId: ctx.organizationId,
      dataScopeSource: "membership",
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrganization(req);
    const body = await req.json();

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const policies = body.policies && typeof body.policies === "object" ? body.policies : undefined;
    const mfaPolicy = typeof body.mfaPolicy === "string" ? body.mfaPolicy : undefined;

    if (!name && !policies && !mfaPolicy) {
      return NextResponse.json({ error: "No supported fields to update" }, { status: 400 });
    }

    const organization = await organizationService.update(
      ctx.organizationId,
      { name, policies, mfaPolicy },
      ctx.identityId
    );

    return NextResponse.json({
      ...organization,
      display_name: organization.name,
      organizationId: ctx.organizationId,
      dataScopeSource: "membership",
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
