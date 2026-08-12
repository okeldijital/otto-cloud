import { NextResponse } from "next/server";
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

/**
 * Tracks have no organization_id column.
 * Access is scoped via tenant_id, primary release, work, or secondary track_releases
 * belonging to the caller's organization (see trackOrgScopeWhere).
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const scope = trackOrgScopeWhere(ctx);

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parseInt(idStr);
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "Invalid track ID" }, { status: 400 });
      }
      const track = await prisma.tracks.findFirst({
        where: { id, ...(scope as object) },
        include: { track_releases: true },
      });
      if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

      return NextResponse.json({
        ...track,
        secondary_release_ids: track.track_releases.map((tr) => tr.release_id),
      });
    }

    const q = searchParams.get("q") || searchParams.get("query") || "";
    if (q || searchParams.get("search")) {
      const limit = parseInt(searchParams.get("limit") || "20");
      const offset = parseInt(searchParams.get("offset") || "0");

      const where: any = {
        AND: [
          scope,
          q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { isrc_code: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      };

      const [items, total] = await Promise.all([
        prisma.tracks.findMany({
          where,
          take: limit,
          skip: offset,
          include: { track_releases: true },
        }),
        prisma.tracks.count({ where }),
      ]);

      return NextResponse.json({
        items: items.map((t) => ({
          ...t,
          secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
        })),
        total,
      });
    }

    const idsStr = searchParams.get("ids");
    if (idsStr) {
      const ids = idsStr
        .split(",")
        .map((s) => parseInt(s))
        .filter((n) => !isNaN(n));
      const items = await prisma.tracks.findMany({
        where: { id: { in: ids }, ...(scope as object) },
        include: { track_releases: true },
      });
      return NextResponse.json({
        items: items.map((t) => ({
          ...t,
          secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
        })),
      });
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const [tracks, total] = await Promise.all([
      prisma.tracks.findMany({
        where: scope as object,
        skip,
        take: limit,
        include: { track_releases: true },
      }),
      prisma.tracks.count({ where: scope as object }),
    ]);

    return NextResponse.json({
      total,
      items: tracks.map((t) => ({
        ...t,
        secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
      })),
    });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
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

      const items = await prisma.tracks.findMany({
        where: { id: { in: ids }, ...(scope as object) },
        include: { track_releases: true },
      });

      return NextResponse.json({
        items: items.map((t) => ({
          ...t,
          secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
        })),
      });
    }

    const { secondary_release_ids, ...trackData } = body;
    delete trackData.organization_id;

    if (trackData.release_id) {
      await requireReleaseInOrg(parseInt(String(trackData.release_id)), ctx);
    }
    if (trackData.work_id) {
      await requireWorkInOrg(parseInt(String(trackData.work_id)), ctx);
    }

    // Stamp tenant for future org scoping
    trackData.tenant_id = ctx.organizationId;

    if (trackData.release_id) {
      const release = await prisma.releases.findFirst({
        where: { id: trackData.release_id, organization_id: ctx.organizationId },
      });
      if (release) {
        if (!trackData.credits && release.credits) trackData.credits = release.credits;
        if (!trackData.release_date && release.release_date)
          trackData.release_date = release.release_date;
        if (!trackData.streaming_link && (release as any).streaming_link)
          trackData.streaming_link = (release as any).streaming_link;
      }
    }

    const newTrack = await prisma.tracks.create({ data: trackData });

    if (secondary_release_ids?.length) {
      for (const rid of secondary_release_ids as number[]) {
        await requireReleaseInOrg(rid, ctx);
        await prisma.track_releases
          .create({ data: { track_id: newTrack.id, release_id: rid } })
          .catch(() => null);
      }
    }

    const full = await prisma.tracks.findUnique({
      where: { id: newTrack.id },
      include: { track_releases: true },
    });

    return NextResponse.json(
      { ...full, secondary_release_ids: full?.track_releases.map((tr) => tr.release_id) ?? [] },
      { status: 201 }
    );
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[POST /api/tracks]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A track with this ISRC, Track ID, or Title already exists." },
        { status: 409 }
      );
    }
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
    const { secondary_release_ids, ...updateData } = body;
    delete updateData.organization_id;

    const existing = await requireTrackInOrg(id, ctx);

    if (updateData.release_id) {
      await requireReleaseInOrg(parseInt(String(updateData.release_id)), ctx);
    }
    if (updateData.work_id) {
      await requireWorkInOrg(parseInt(String(updateData.work_id)), ctx);
    }

    updateData.tenant_id = ctx.organizationId;

    if (updateData.release_id !== undefined && updateData.release_id !== existing.release_id) {
      if (updateData.release_id) {
        const release = await prisma.releases.findFirst({
          where: { id: updateData.release_id, organization_id: ctx.organizationId },
        });
        if (release) {
          if (!updateData.credits && !existing.credits && release.credits)
            updateData.credits = release.credits;
          if (!existing.release_date && !updateData.release_date && release.release_date)
            updateData.release_date = release.release_date;
          if ((release as any).streaming_link && !("streaming_link" in updateData))
            updateData.streaming_link = (release as any).streaming_link;
        }
      }
    }

    await prisma.tracks.update({ where: { id }, data: updateData });

    if (secondary_release_ids !== undefined) {
      await prisma.track_releases.deleteMany({ where: { track_id: id } });
      if (secondary_release_ids.length) {
        for (const rid of secondary_release_ids as number[]) {
          await requireReleaseInOrg(rid, ctx);
          await prisma.track_releases
            .create({ data: { track_id: id, release_id: rid } })
            .catch(() => null);
        }
      }
    }

    const full = await prisma.tracks.findFirst({
      where: { id, ...(trackOrgScopeWhere(ctx) as object) },
      include: { track_releases: true },
    });

    return NextResponse.json({
      ...full,
      secondary_release_ids: full?.track_releases.map((tr) => tr.release_id) ?? [],
    });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[PUT /api/tracks]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This track title or ISRC might already be in use." },
        { status: 409 }
      );
    }
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
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[DELETE /api/tracks]", err);
    return NextResponse.json({ error: `Could not delete track: ${err.message}` }, { status: 400 });
  }
}
