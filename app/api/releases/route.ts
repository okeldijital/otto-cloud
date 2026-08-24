import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, orgWhereActive, requireOrganization } from "@/lib/auth/organization-context";
import { requireOrgAuth, requireReleaseInOrg, resourceAuthErrorResponse, trackOrgScopeWhere } from "@/lib/auth/resource-authorization";
import { validateReleaseMetadata } from "@/lib/releases/validation";

const RELEASE_STATUSES = ["draft", "ready", "scheduled", "released"] as const;
type ReleaseStatus = (typeof RELEASE_STATUSES)[number];
const RELEASE_TRANSITIONS: Record<ReleaseStatus, readonly ReleaseStatus[]> = {
  draft: ["draft", "ready"],
  ready: ["ready", "scheduled"],
  scheduled: ["scheduled", "released"],
  released: ["released"],
};

function isReleaseStatus(value: unknown): value is ReleaseStatus {
  return typeof value === "string" && (RELEASE_STATUSES as readonly string[]).includes(value);
}

function validateReleaseTransition(current: unknown, next: unknown): { ok: true } | { ok: false; error: string } {
  if (!isReleaseStatus(current) || !isReleaseStatus(next)) return { ok: false, error: "Invalid release status. Expected draft, ready, scheduled, or released." };
  if (!RELEASE_TRANSITIONS[current].includes(next)) return { ok: false, error: `Invalid release status transition: ${current} → ${next}.` };
  return { ok: true };
}

async function getReleaseStatus(id: number): Promise<ReleaseStatus> {
  const rows = await prisma.$queryRaw<Array<{ status: string }>>`SELECT status FROM "releases" WHERE id = ${id} LIMIT 1`;
  const status = rows[0]?.status;
  if (!isReleaseStatus(status)) throw new Error(`Invalid persisted release status for release ${id}`);
  return status;
}

async function setReleaseStatus(id: number, status: ReleaseStatus): Promise<void> {
  await prisma.$executeRaw`UPDATE "releases" SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const relation = searchParams.get("relation");
      if (relation === "tracks") {
        const release = await prisma.releases.findFirst({ where: { id, organization_id: orgId, is_deleted: false }, select: { id: true } });
        if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });
        const tracks = await prisma.tracks.findMany({ where: { release_id: id, ...(trackOrgScopeWhere(ctx) as object) }, include: { track_releases: true } });
        return NextResponse.json(tracks.map((t) => ({ ...t, secondary_release_ids: t.track_releases.map((tr) => tr.release_id) })));
      }
      const release = await prisma.releases.findFirst({ where: { id, organization_id: orgId, is_deleted: false } });
      if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });
      const tracks = await prisma.tracks.findMany({ where: { release_id: id, ...(trackOrgScopeWhere(ctx) as object) } });
      const trackIds = tracks.map((t) => t.id);
      let hasContract = !!(await prisma.contract_assets.findFirst({ where: { asset_type: "Release", asset_id: id } }));
      if (!hasContract && trackIds.length) hasContract = !!(await prisma.contract_assets.findFirst({ where: { asset_type: "Track", asset_id: { in: trackIds } } }));
      const artistIdList: number[] = [];
      if (release.artist_id) artistIdList.push(release.artist_id);
      if (Array.isArray(release.artist_ids)) artistIdList.push(...(release.artist_ids as number[]));
      const hasArtistContract = artistIdList.length > 0 ? !!(await prisma.contract_parties.findFirst({ where: { entity_type: "Artist", entity_id: { in: artistIdList } } })) : false;
      return NextResponse.json({ ...release, status: await getReleaseStatus(id), _tracks: tracks, _hasContract: hasContract, _hasArtistContract: hasArtistContract });
    }
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const where = orgWhereActive(ctx);
    const [releases, total] = await Promise.all([prisma.releases.findMany({ where, skip, take: limit, orderBy: { created_at: "desc" } }), prisma.releases.count({ where })]);
    const enriched = await Promise.all(releases.map(async (r) => {
      const tracks = await prisma.tracks.findMany({ where: { release_id: r.id, ...(trackOrgScopeWhere(ctx) as object) } });
      const trackIds = tracks.map((t) => t.id);
      let hasContract = !!(await prisma.contract_assets.findFirst({ where: { asset_type: "Release", asset_id: r.id } }));
      if (!hasContract && trackIds.length) hasContract = !!(await prisma.contract_assets.findFirst({ where: { asset_type: "Track", asset_id: { in: trackIds } } }));
      const artistIdList: number[] = [];
      if (r.artist_id) artistIdList.push(r.artist_id);
      if (Array.isArray(r.artist_ids)) artistIdList.push(...(r.artist_ids as number[]));
      const hasArtistContract = artistIdList.length > 0 ? !!(await prisma.contract_parties.findFirst({ where: { entity_type: "Artist", entity_id: { in: artistIdList } } })) : false;
      return { ...r, status: await getReleaseStatus(r.id), _tracks: tracks, _hasContract: hasContract, _hasArtistContract: hasArtistContract };
    }));
    return NextResponse.json({ total, items: enriched });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/releases]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const body = await req.json();
    const { track_ids, ...releaseData } = body;
    const requestedStatus = releaseData.status;
    delete releaseData.status;
    const metadataValidation = validateReleaseMetadata(releaseData, "create");
    if (!metadataValidation.valid) return NextResponse.json({ error: "Invalid release metadata", fields: metadataValidation.errors }, { status: 400 });
    releaseData.organization_id = ctx.organizationId;
    if (requestedStatus !== undefined) {
      const transition = validateReleaseTransition("draft", requestedStatus);
      if (!transition.ok) return NextResponse.json({ error: transition.error }, { status: 400 });
    }
    if (track_ids !== undefined && (!Array.isArray(track_ids) || track_ids.some((id: unknown) => !Number.isInteger(id)))) return NextResponse.json({ error: "track_ids must be an array of integer track IDs." }, { status: 400 });
    if (track_ids?.length) {
      const uniqueTrackIds = [...new Set<number>(track_ids)];
      const accessibleTracks = await prisma.tracks.findMany({ where: { id: { in: uniqueTrackIds }, ...(trackOrgScopeWhere(ctx) as object) }, select: { id: true } });
      if (accessibleTracks.length !== uniqueTrackIds.length) return NextResponse.json({ error: "One or more tracks are not accessible to this organization" }, { status: 404 });
    }
    const existing = await prisma.releases.findFirst({ where: { title: releaseData.title, organization_id: ctx.organizationId } });
    if (existing) return NextResponse.json({ error: `A release with the title '${releaseData.title}' already exists.` }, { status: 409 });
    let newRelease = await prisma.releases.create({ data: releaseData });
    if (requestedStatus !== undefined && requestedStatus !== "draft") {
      await setReleaseStatus(newRelease.id, requestedStatus);
      newRelease = { ...newRelease, status: requestedStatus } as typeof newRelease;
    } else newRelease = { ...newRelease, status: "draft" } as typeof newRelease;
    try {
      const userId = (session.user as any).id;
      const template = await prisma.workspace_templates.findFirst({ where: { slug: "release" } });
      const workspaceName = `${newRelease.title} - ${newRelease.release_type || "Single"} Release`;
      const workspace = await prisma.workspaces.create({ data: { name: workspaceName, description: `Release workspace for "${newRelease.title}"`, template_id: template?.id, release_id: newRelease.id, status: "planning", organization_id: newRelease.organization_id, created_by: userId } });
      await prisma.workspace_members.create({ data: { workspace_id: workspace.id, user_id: userId, role: "owner" } });
      await prisma.workspace_timeline_events.create({ data: { workspace_id: workspace.id, user_id: userId, event_type: "system", summary: `Release workspace created for "${newRelease.title}"` } });
      const channels = ["General", "Artwork", "Marketing", "Distribution", "Production", "Legal"];
      for (let i = 0; i < channels.length; i++) await prisma.workspace_discussion_channels.create({ data: { workspace_id: workspace.id, organization_id: newRelease.organization_id, name: channels[i], slug: channels[i].toLowerCase(), sort_order: i, created_by: userId } });
    } catch (wsErr) { console.error("[Release Workspace auto-create failed]", wsErr); }
    if (track_ids?.length) await Promise.all((await prisma.tracks.findMany({ where: { id: { in: track_ids }, ...(trackOrgScopeWhere(ctx) as object) } })).map((t) => prisma.tracks.update({ where: { id: t.id }, data: { release_id: newRelease.id, tenant_id: ctx.organizationId, credits: !t.credits && newRelease.credits ? (newRelease.credits as any) : ((t.credits as any) ?? undefined) } })));
    return NextResponse.json(newRelease, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/releases]", err);
    if (err.code === "P2002") return NextResponse.json({ error: "A release with this Title, Catalog Number, or UPC already exists." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing release ID" }, { status: 400 });
    const id = parseInt(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid release ID" }, { status: 400 });
    const body = await req.json();
    const { track_ids, ...updateData } = body;
    delete updateData.organization_id;
    delete updateData.organizationId;
    const existing = await requireReleaseInOrg(id, ctx);
    const metadataValidation = validateReleaseMetadata(updateData, "update");
    if (!metadataValidation.valid) return NextResponse.json({ error: "Invalid release metadata", fields: metadataValidation.errors }, { status: 400 });
    const requestedStatus = updateData.status;
    delete updateData.status;
    if (requestedStatus !== undefined) {
      const currentStatus = await getReleaseStatus(id);
      const transition = validateReleaseTransition(currentStatus, requestedStatus);
      if (!transition.ok) return NextResponse.json({ error: transition.error }, { status: 400 });
    }
    if (track_ids !== undefined && (!Array.isArray(track_ids) || track_ids.some((tid: unknown) => !Number.isInteger(tid)))) return NextResponse.json({ error: "track_ids must be an array of integer track IDs." }, { status: 400 });
    if (track_ids !== undefined) {
      const uniqueTrackIds = [...new Set<number>(track_ids)];
      const accessibleTracks = await prisma.tracks.findMany({ where: { id: { in: uniqueTrackIds }, ...(trackOrgScopeWhere(ctx) as object) }, select: { id: true } });
      if (accessibleTracks.length !== uniqueTrackIds.length) return NextResponse.json({ error: "One or more tracks are not accessible to this organization" }, { status: 404 });
    }
    if (updateData.title && updateData.title !== existing.title) {
      const dup = await prisma.releases.findFirst({ where: { title: updateData.title, organization_id: ctx.organizationId, is_deleted: false } });
      if (dup) return NextResponse.json({ error: `A release with the title '${updateData.title}' already exists.` }, { status: 409 });
    }
    const updated = await prisma.releases.update({ where: { id }, data: updateData });
    if (requestedStatus !== undefined) await setReleaseStatus(id, requestedStatus);
    const responseRelease = { ...updated, status: requestedStatus !== undefined ? requestedStatus : await getReleaseStatus(id) };
    if (track_ids !== undefined) {
      const currentTracks = await prisma.tracks.findMany({ where: { release_id: id, ...(trackOrgScopeWhere(ctx) as object) } });
      const currentIds = new Set(currentTracks.map((t) => t.id));
      const newIds = new Set<number>(track_ids);
      const toUnassign = Array.from(currentIds).filter((tid) => !newIds.has(tid));
      if (toUnassign.length) await prisma.tracks.updateMany({ where: { id: { in: toUnassign }, release_id: id, ...(trackOrgScopeWhere(ctx) as object) }, data: { release_id: null } });
      const toAssign = Array.from(newIds).filter((tid) => !currentIds.has(tid));
      if (toAssign.length) {
        const tracksToAssign = await prisma.tracks.findMany({ where: { id: { in: toAssign }, ...(trackOrgScopeWhere(ctx) as object) } });
        if (tracksToAssign.length !== toAssign.length) return NextResponse.json({ error: "One or more tracks are not accessible to this organization" }, { status: 404 });
        await Promise.all(tracksToAssign.map((t) => prisma.tracks.update({ where: { id: t.id }, data: { release_id: id, tenant_id: ctx.organizationId, credits: !t.credits && responseRelease.credits ? (responseRelease.credits as any) : ((t.credits as any) ?? undefined) } }));
      }
    }
    return NextResponse.json(responseRelease);
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[PUT /api/releases]", err);
    if (err.code === "P2002") return NextResponse.json({ error: "A database integrity error occurred. This release title, catalog number, or UPC might already be in use." }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing release ID" }, { status: 400 });
    const id = parseInt(idStr);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid release ID" }, { status: 400 });
    await requireReleaseInOrg(id, ctx);
    await prisma.tracks.updateMany({ where: { release_id: id, ...(trackOrgScopeWhere(ctx) as object) }, data: { release_id: null } });
    await prisma.releases.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[DELETE /api/releases]", err);
    if (err.code === "P2003" || err.code === "P2014") return NextResponse.json({ error: "Cannot delete release because it is linked to contracts or other strict dependencies." }, { status: 409 });
    return NextResponse.json({ error: `Could not delete release: ${err.message}` }, { status: 400 });
  }
}
