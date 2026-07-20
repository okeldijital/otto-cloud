import { NextRequest, NextResponse } from "next/server";
import {
  getEntityArtwork,
  getEntityArtworkBatch,
} from "@/lib/media/entity-artwork";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";

/**
 * Resolve entity artwork via Storage Service signed URLs.
 *
 * GET /api/storage/entity?entityType=release&entityId=1
 * GET /api/storage/entity?entityType=release&ids=1,2,3  (batch)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const entityType = (searchParams.get("entityType") || "").trim().toLowerCase();
    const entityId = searchParams.get("entityId");
    const idsParam = searchParams.get("ids");

    if (!entityType) {
      return NextResponse.json({ error: "entityType is required" }, { status: 400 });
    }

    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const map = await getEntityArtworkBatch(entityType, ids, {
        sessionOrganizationId: ctx.organizationId,
      });
      return NextResponse.json({ items: map });
    }

    if (!entityId) {
      return NextResponse.json(
        { error: "entityId or ids is required" },
        { status: 400 }
      );
    }

    const artwork = await getEntityArtwork(entityType, entityId, {
      sessionOrganizationId: ctx.organizationId,
    });

    if (!artwork) {
      return NextResponse.json({ artwork: null }, { status: 200 });
    }

    return NextResponse.json({ artwork });
  } catch (err) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/storage/entity]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
