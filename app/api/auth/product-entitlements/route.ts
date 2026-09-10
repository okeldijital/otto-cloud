import { NextResponse } from "next/server";
import { requireOrganization, orgContextErrorResponse } from "@/lib/auth/organization-context";
import { resolveProductEntitlements } from "@/lib/platform/productization";

export async function GET() {
  try {
    const ctx = await requireOrganization();
    const entitlements = await resolveProductEntitlements(ctx.organizationId);
    return NextResponse.json(entitlements, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err: unknown) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/auth/product-entitlements]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
