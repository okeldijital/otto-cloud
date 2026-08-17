import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import { playlistOrgScopeWhere, requireLegacyIntOrgId, trackOrgScopeWhere } from "@/lib/auth/resource-authorization";
import { releaseContractReadModelService } from "@/lib/release-workspace/contracts";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const legacyIntOrgId = requireLegacyIntOrgId(ctx);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    if (!q || q.length < 1) return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    const searchFilter = { contains: q, mode: "insensitive" as const };
    const [artists, releases, tracks, works, contracts, labels, publishers, pros, documents, notes, playlists, networkOrgs, individuals, releaseContracts] = await Promise.all([
      prisma.artists.findMany({ where: { organization_id: orgId, OR: [{ name: searchFilter }, { aka: searchFilter }, { artist_id: searchFilter }] }, take: 5 }).catch(() => []),
      prisma.releases.findMany({ where: { organization_id: orgId, OR: [{ title: searchFilter }, { upc_code: searchFilter }, { catalog_number: searchFilter }, { release_id: searchFilter }] }, take: 5 }).catch(() => []),
      prisma.tracks.findMany({ where: { AND: [trackOrgScopeWhere(ctx), { OR: [{ title: searchFilter }, { isrc_code: searchFilter }, { track_id: searchFilter }] }] }, take: 5 }).catch(() => []),
      prisma.works.findMany({ where: { organization_id: orgId, OR: [{ title: searchFilter }, { iswc_code: searchFilter }, { work_id: searchFilter }] }, take: 5 }).catch(() => []),
      prisma.contracts.findMany({ where: { organization_id: legacyIntOrgId, OR: [{ title: searchFilter }, { contract_number: searchFilter }] }, take: 5 }).catch(() => []),
      prisma.labels.findMany({ where: { OR: [{ name: searchFilter }, { contact_person: searchFilter }] }, take: 5 }).catch(() => []),
      prisma.publishers.findMany({ where: { name: searchFilter }, take: 5 }).catch(() => []),
      prisma.pros.findMany({ where: { name: searchFilter }, take: 5 }).catch(() => []),
      prisma.documents.findMany({ where: { organization_id: orgId, OR: [{ title: searchFilter }, { description: searchFilter }] }, take: 5 }).catch(() => []),
      prisma.notes.findMany({ where: { organization_id: orgId, OR: [{ title: searchFilter }, { content: searchFilter }] }, take: 5 }).catch(() => []),
      prisma.playlists.findMany({ where: { AND: [playlistOrgScopeWhere(ctx), { OR: [{ name: searchFilter }, { description: searchFilter }] }] }, take: 5 }).catch(() => []),
      prisma.organizations.findMany({ where: { name: searchFilter, organization_id: legacyIntOrgId }, take: 5 }).catch(() => []),
      prisma.individuals.findMany({ where: { organization_id: legacyIntOrgId, OR: [{ first_name: searchFilter }, { last_name: searchFilter }] }, take: 5 }).catch(() => []),
      releaseContractReadModelService.search({ organizationId: orgId, q, limit: 8 }).catch(() => []),
    ]);
    return NextResponse.json({
      artists: artists.map(a => ({ id: a.id, name: a.name, type: "artist" })),
      releases: releases.map(r => ({ id: r.id, title: r.title, type: "release" })),
      tracks: tracks.map(t => ({ id: t.id, title: t.title, type: "track", release_id: t.release_id })),
      works: works.map(w => ({ id: w.id, title: w.title, type: "work" })),
      contracts: contracts.map(c => ({ id: c.id, title: c.title, type: "contract" })),
      labels: labels.map(l => ({ id: l.id, name: l.name, type: "label" })),
      publishers: publishers.map(p => ({ id: p.id, name: p.name, type: "publisher" })),
      pros: pros.map(p => ({ id: p.id, name: p.name, type: "pro" })),
      documents: documents.map(d => ({ id: d.id, title: d.title, type: "document" })),
      notes: notes.map(n => ({ id: n.id, title: n.title, type: "note" })),
      playlists: playlists.map(p => ({ id: p.id, title: p.name, type: "playlist" })),
      network: [...networkOrgs.map(o => ({ id: o.id, name: o.name, type: "organization", entity_type: "Network" })), ...individuals.map(i => ({ id: i.id, name: `${i.first_name} ${i.last_name}`, type: "individual", entity_type: "Network" }))],
      releaseContracts: (releaseContracts as any[]).map((rc) => ({ id: rc.contractId, releaseId: rc.releaseId, title: rc.contractTitle || `Contract #${rc.contractId}`, type: "release_contract", lifecycleStatus: rc.lifecycleStatus, healthStatus: rc.healthStatus, parties: (rc.parties || []).map((p: any) => p.name).filter(Boolean), href: `/catalog/releases/${rc.releaseId}/workspace`, contractHref: `/contracts/${rc.contractId}` })),
    });
  } catch (error: unknown) {
    const mapped = orgContextErrorResponse(error);
    if (mapped.status === 401 || mapped.status === 403) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("Error global search:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
