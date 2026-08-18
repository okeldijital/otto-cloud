import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth/organization-context";
import { evaluateReleaseReadiness } from "@/lib/releases/readiness";
import { requireReleaseInOrg, resourceAuthErrorResponse } from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing release ID" }, { status: 400 });
    const id = Number(idStr);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid release ID" }, { status: 400 });

    await requireReleaseInOrg(id, ctx);
    const readiness = await evaluateReleaseReadiness(id, ctx);
    if (!readiness) return NextResponse.json({ error: "Release not found" }, { status: 404 });

    return NextResponse.json({ release_id: id, ...readiness }, { status: readiness.ready ? 200 : 409 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/releases/readiness]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
