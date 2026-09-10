import { NextResponse } from "next/server";
import { requireOrganization, orgWhereActive, orgContextErrorResponse } from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight release catalogue read path.
 *
 * The legacy /api/releases list path enriches every release with tracks,
 * contract state, and artist relations. That enrichment is unnecessary for
 * the catalogue table and can fail the entire list when an auxiliary legacy
 * relation is unavailable. Keep the list contract small and org-scoped.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const skipRaw = Number.parseInt(searchParams.get("skip") || "0", 10);
    const limitRaw = Number.parseInt(searchParams.get("limit") || "100", 10);
    const skip = Number.isFinite(skipRaw) && skipRaw >= 0 ? skipRaw : 0;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 100;

    // Use the same authoritative organization predicate as the canonical
    // release API, but select only fields required by the catalogue list.
    const where = orgWhereActive(ctx);
    const [releases, total] = await Promise.all([
      prisma.releases.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          release_id: true,
          title: true,
          release_date: true,
          release_type: true,
          catalog_number: true,
          cover_art_url: true,
          organization_id: true,
        },
      }),
      prisma.releases.count({ where }),
    ]);

    return NextResponse.json({ total, items: releases });
  } catch (err: unknown) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/releases/list]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
