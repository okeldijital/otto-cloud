import { NextResponse } from "next/server";
import { requireOrgAuth, requireReleaseInOrg, requireTrackInOrg, resourceAuthErrorResponse } from "@/lib/auth/resource-authorization";
import { getCatalogArtistIds, replaceCatalogArtistIds, type CatalogArtistRelationEntity } from "@/lib/catalog-artist-relations";

function parseEntity(value: string | null): CatalogArtistRelationEntity | null {
  if (value === "release" || value === "track") return value;
  return null;
}

function parseId(value: string | null): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function authorizeEntity(entity: CatalogArtistRelationEntity, id: number, ctx: Awaited<ReturnType<typeof requireOrgAuth>>) {
  if (entity === "release") return requireReleaseInOrg(id, ctx);
  return requireTrackInOrg(id, ctx);
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const entity = parseEntity(searchParams.get("entity"));
    const id = parseId(searchParams.get("id"));

    if (!entity) return NextResponse.json({ error: "entity must be release or track" }, { status: 400 });
    if (!id) return NextResponse.json({ error: "id must be a positive integer" }, { status: 400 });

    await authorizeEntity(entity, id, ctx);
    const artist_ids = await getCatalogArtistIds(entity, id);
    return NextResponse.json({ entity, id, artist_ids });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/catalog/artist-relations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const entity = parseEntity(searchParams.get("entity"));
    const id = parseId(searchParams.get("id"));

    if (!entity) return NextResponse.json({ error: "entity must be release or track" }, { status: 400 });
    if (!id) return NextResponse.json({ error: "id must be a positive integer" }, { status: 400 });

    await authorizeEntity(entity, id, ctx);
    const body = await req.json();
    if (!body || !Array.isArray(body.artist_ids)) {
      return NextResponse.json({ error: "artist_ids must be an array of artist IDs" }, { status: 400 });
    }

    const artist_ids = await replaceCatalogArtistIds(entity, id, ctx.organizationId, body.artist_ids);
    return NextResponse.json({ entity, id, artist_ids });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    if (err instanceof Error && err.message.includes("artists are not accessible")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes("artist_ids must contain")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[PUT /api/catalog/artist-relations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
