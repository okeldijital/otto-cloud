import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  requireOrgAuth,
  requireReleaseInOrg,
  requireTrackInOrg,
  requireWorkInOrg,
  resourceAuthErrorResponse,
  trackOrgScopeWhere,
} from "@/lib/auth/resource-authorization";
import { getCatalogArtistIds, replaceCatalogArtistIds } from "@/lib/catalog-artist-relations";
import { replaceTrackSecondaryReleases, setTrackReleaseRelations } from "@/lib/catalog-release-relations";

function normalizeDuration(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value !== "string") throw new Error("Invalid duration");
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/);
  if (!match) throw new Error("Duration must use HH:MM, HH:MM:SS, or HH:MM:SS.ffffff format");
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || "0");
  const micros = (match[4] || "").padEnd(6, "0");
  const milliseconds = Number(micros.slice(0, 3) || "0");
  if (hours > 23 || minutes > 59 || seconds > 59) throw new Error("Duration must be a valid PostgreSQL time value");
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds, milliseconds));
}

function normalizeTrackPayload(input: Record<string, any>) {
  const payload = { ...input };
  delete payload.organization_id;
  delete payload.organizationId;
  delete payload.artist_ids;
  if ("duration" in payload) payload.duration = normalizeDuration(payload.duration);
  return payload;
}

async function getTrackArtistIdsCompat(trackId: number, legacyArtistIds: unknown) {
  const artistIds = await getCatalogArtistIds("track", trackId);
  if (artistIds.length) return artistIds;
  return Array.isArray(legacyArtistIds) ? (legacyArtistIds as number[]) : [];
}

function getSecondaryReleaseIds(track: { track_releases: Array<{ release_id: number }> }) {
  return track.track_releases.map((tr) => tr.release_id);
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const scope = trackOrgScopeWhere(ctx);
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid track ID" }, { status: 400 });
      const track = await prisma.tracks.findFirst({ where: { id, ...(scope as object) }, include: { track_releases: true } });
      if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
      const artist_ids = await getTrackArtistIdsCompat(id, track.artist_ids);
      return NextResponse.json({ ...track, artist_ids, secondary_release_ids: getSecondaryReleaseIds(track) });
    }
    const q = searchParams.get("q") || searchParams.get("query") || "";
    if (q || searchParams.get("search")) {
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = parseInt(searchParams.get("offset") || "0");
      const where: any = { AND: [scope, q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { isrc_code: { contains: q, mode: "insensitive" } }] } : {}] };
      const [items, total] = await Promise.all([
        prisma.tracks.findMany({ where, take: limit, skip: offset, include: { track_releases: true } }),
        prisma.tracks.count({ where }),
      ]);
      const enriched = await Promise.all(items.map(async (t) => ({ ...t, artist_ids: await getTrackArtistIdsCompat(t.id, t.artist_ids), secondary_release_ids: getSecondaryReleaseIds(t) })));
      return NextResponse.json({ items: enriched, total });
    }
    const idsStr = searchParams.get("ids");
    if (idsStr) {
      const ids = idsStr.split(",").map((s) => parseInt(s)).filter((n) => !isNaN(n));
      const items = await prisma.tracks.findMany({ where: { id: { in: ids }, ...(scope as object) }, include: { track_releases: true } });
      const enriched = await Promise.all(items.map(async (t) => ({ ...t, artist_ids: await getTrackArtistIdsCompat(t.id, t.artist_ids), secondary_release_ids: getSecondaryReleaseIds(t) })));
      return NextResponse.json({ items: enriched });
    }
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const [tracks, total] = await Promise.all([
      prisma.tracks.findMany({ where: scope as object, skip, take: limit, include: { track_releases: true } }),
      prisma.tracks.count({ where: scope as object }),
    ]);
    const enriched = await Promise.all(tracks.map(async (t) => ({ ...t, artist_ids: await getTrackArtistIdsCompat(t.id, t.artist_ids), secondary_release_ids: getSecondaryReleaseIds(t) })));
    return NextResponse.json({ total, items: enriched });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/tracks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const scope = trackOrgScopeWhere(ctx);
    const body = await req.json();
    if (Array.isArray(body.ids)) {
      const ids: number[] = body.ids;
      if (!ids.length) return NextResponse.json({ items: [] });
      const items = await prisma.tracks.findMany({ where: { id: { in: ids }, ...(scope as object) }, include: { track_releases: true } });
      const enriched = await Promise.all(items.map(async (t) => ({ ...t, artist_ids: await getTrackArtistIdsCompat(t.id, t.artist_ids), secondary_release_ids: getSecondaryReleaseIds(t) })));
      return NextResponse.json({ items: enriched });
    }
    const { secondary_release_ids, artist_ids, ...rawTrackData } = body;
    const trackData = normalizeTrackPayload(rawTrackData) as Prisma.tracksUncheckedCreateInput;
    if (trackData.release_id) await requireReleaseInOrg(parseInt(String(trackData.release_id)), ctx);
    if (trackData.work_id) await requireWorkInOrg(parseInt(String(trackData.work_id)), ctx);
    trackData.tenant_id = ctx.organizationId;
    if (trackData.release_id) {
      const release = await prisma.releases.findFirst({ where: { id: trackData.release_id, organization_id: ctx.organizationId } });
      if (release) {
        if (!trackData.credits && release.credits) trackData.credits = release.credits;
        if (!trackData.release_date && release.release_date) trackData.release_date = release.release_date;
        if (!trackData.streaming_link && (release as any).streaming_link) trackData.streaming_link = (release as any).streaming_link;
      }
    }
    const newTrack = await prisma.tracks.create({ data: trackData });
    if (Array.isArray(artist_ids)) await replaceCatalogArtistIds("track", newTrack.id, ctx.organizationId, artist_ids);
    if (secondary_release_ids !== undefined) {
      try {
        await replaceTrackSecondaryReleases(newTrack.id, secondary_release_ids, newTrack.release_id, ctx);
      } catch (err) {
        await prisma.tracks.delete({ where: { id: newTrack.id } }).catch(() => null);
        throw err;
      }
    }
    const full = await prisma.tracks.findUnique({ where: { id: newTrack.id }, include: { track_releases: true } });
    const canonicalArtistIds = await getTrackArtistIdsCompat(newTrack.id, full?.artist_ids);
    return NextResponse.json({ ...full, artist_ids: canonicalArtistIds, secondary_release_ids: full ? getSecondaryReleaseIds(full) : [] }, { status: 201 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    if (err?.message?.startsWith("Duration")) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err?.message?.includes("artist_ids must contain") || err?.message?.includes("artists are not accessible") || err?.message?.includes("secondary_release_ids") || err?.message?.includes("primary release cannot")) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[POST /api/tracks]", err);
    if (err.code === "P2002") return NextResponse.json({ error: "A track with this ISRC, Track ID, or Title already exists." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing track ID" }, { status: 400 });
    const id = parseInt(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid track ID" }, { status: 400 });
    const body = await req.json();
    const { secondary_release_ids, artist_ids, ...rawUpdateData } = body;
    const updateData = normalizeTrackPayload(rawUpdateData) as Prisma.tracksUncheckedUpdateInput;
    const existing = await requireTrackInOrg(id, ctx);
    if (updateData.release_id !== undefined && updateData.release_id !== null) await requireReleaseInOrg(parseInt(String(updateData.release_id)), ctx);
    if (updateData.work_id) await requireWorkInOrg(parseInt(String(updateData.work_id)), ctx);
    updateData.tenant_id = ctx.organizationId;
    if (updateData.release_id !== undefined && updateData.release_id !== existing.release_id && updateData.release_id) {
      const release = await prisma.releases.findFirst({ where: { id: updateData.release_id as number, organization_id: ctx.organizationId } });
      if (release) {
        if (!updateData.credits && !existing.credits && release.credits) updateData.credits = release.credits;
        if (!existing.release_date && !updateData.release_date && release.release_date) updateData.release_date = release.release_date;
        if ((release as any).streaming_link && !("streaming_link" in updateData)) updateData.streaming_link = (release as any).streaming_link;
      }
    }
    if (secondary_release_ids !== undefined) {
      const prospectivePrimary = updateData.release_id === undefined ? existing.release_id : (updateData.release_id as number | null);
      await setTrackReleaseRelations(id, prospectivePrimary, secondary_release_ids, ctx);
      delete updateData.release_id;
    }
    if (Object.keys(updateData).length) await prisma.tracks.update({ where: { id }, data: updateData });
    if (artist_ids !== undefined) {
      if (!Array.isArray(artist_ids)) return NextResponse.json({ error: "artist_ids must be an array of artist IDs" }, { status: 400 });
      await replaceCatalogArtistIds("track", id, ctx.organizationId, artist_ids);
    }
    if (secondary_release_ids === undefined && updateData.release_id !== undefined) {
      await prisma.tracks.update({ where: { id }, data: { release_id: updateData.release_id } });
    }
    const full = await prisma.tracks.findFirst({ where: { id, ...(trackOrgScopeWhere(ctx) as object) }, include: { track_releases: true } });
    const canonicalArtistIds = await getTrackArtistIdsCompat(id, full?.artist_ids);
    return NextResponse.json({ ...full, artist_ids: canonicalArtistIds, secondary_release_ids: full ? getSecondaryReleaseIds(full) : [] });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    if (err?.message?.startsWith("Duration")) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err?.message?.includes("artist_ids must contain") || err?.message?.includes("artists are not accessible") || err?.message?.includes("secondary_release_ids") || err?.message?.includes("primary release cannot")) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[PUT /api/tracks]", err);
    if (err.code === "P2002") return NextResponse.json({ error: "A database integrity error occurred. This track title or ISRC might already be in use." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing track ID" }, { status: 400 });
    const id = parseInt(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid track ID" }, { status: 400 });
    await requireTrackInOrg(id, ctx);
    await prisma.track_releases.deleteMany({ where: { track_id: id } });
    await prisma.tracks.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[DELETE /api/tracks]", err);
    return NextResponse.json({ error: `Could not delete track: ${err.message}` }, { status: 400 });
  }
}
