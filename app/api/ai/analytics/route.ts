import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import {
  requireLegacyIntOrgId,
  requireActorUserId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgIdStr = ctx.organizationId;
    const orgIdInt = requireLegacyIntOrgId(ctx);

    if (action === "overview") {
      const [totalContracts, totalArtists, totalReleases, totalTracks, totalWorks, totalAiSessions] =
        await Promise.all([
          prisma.contracts.count({ where: { organization_id: orgIdInt } }),
          prisma.artists.count({ where: { organization_id: orgIdStr } }),
          prisma.releases.count({ where: { organization_id: orgIdStr } }),
          prisma.tracks.count(),
          prisma.works.count({ where: { organization_id: orgIdStr } }),
          prisma.ai_sessions.count({ where: { organization_id: orgIdStr } }),
        ]);

      const [resolutionRuns, proposalRuns, integrationRuns, royaltyRuns] = await Promise.all([
        prisma.ai_contract_resolution_runs.count({ where: { organization_id: orgIdStr } }),
        prisma.ai_core_write_proposal_runs.count({ where: { organization_id: orgIdInt } }),
        prisma.ai_release_integration_runs.count({ where: { organization_id: orgIdInt } }),
        prisma.ai_royalty_simulation_runs.count({ where: { organization_id: orgIdInt } }),
      ]);
      const totalAiRuns = resolutionRuns + proposalRuns + integrationRuns + royaltyRuns;

      const contractsByStatus = await prisma.contracts.groupBy({
        by: ["status"],
        where: { organization_id: orgIdInt },
        _count: true,
      });
      const completenessSummary: Record<string, number> = {};
      for (const row of contractsByStatus) {
        completenessSummary[row.status] = row._count;
      }

      return NextResponse.json({
        total_contracts: totalContracts,
        total_artists: totalArtists,
        total_releases: totalReleases,
        total_tracks: totalTracks,
        total_works: totalWorks,
        total_ai_sessions: totalAiSessions,
        total_ai_runs: totalAiRuns,
        completeness_summary: completenessSummary,
      });
    }

    if (action === "contracts") {
      const contracts = await prisma.contracts.findMany({
        where: { organization_id: orgIdInt },
        orderBy: { created_at: "desc" },
        take: 10,
        select: { id: true, title: true, status: true, type: true, created_at: true },
      });

      const byStatus = await prisma.contracts.groupBy({
        by: ["status"],
        where: { organization_id: orgIdInt },
        _count: true,
      });
      const byType = await prisma.contracts.groupBy({
        by: ["type"],
        where: { organization_id: orgIdInt },
        _count: true,
      });

      return NextResponse.json({
        total_contracts: await prisma.contracts.count({ where: { organization_id: orgIdInt } }),
        by_status: Object.fromEntries(byStatus.map((r: any) => [r.status, r._count])),
        by_type: Object.fromEntries(byType.map((r: any) => [r.type, r._count])),
        recent: contracts,
      });
    }

    if (action === "catalog") {
      const [totalArtists, totalReleases, totalTracks, totalWorks] = await Promise.all([
        prisma.artists.count({ where: { organization_id: orgIdStr } }),
        prisma.releases.count({ where: { organization_id: orgIdStr } }),
        prisma.tracks.count(),
        prisma.works.count({ where: { organization_id: orgIdStr } }),
      ]);

      const byArtistType = await prisma.artists.groupBy({
        by: ["artist_kind"],
        where: { organization_id: orgIdStr },
        _count: true,
      });

      const byReleaseType = await prisma.releases.groupBy({
        by: ["release_type"],
        where: { organization_id: orgIdStr },
        _count: true,
      });

      return NextResponse.json({
        total_artists: totalArtists,
        total_releases: totalReleases,
        total_tracks: totalTracks,
        total_works: totalWorks,
        total_royalties: totalTracks,
        by_artist_type: Object.fromEntries(byArtistType.map((r: any) => [r.artist_kind, r._count])),
        by_release_type: Object.fromEntries(byReleaseType.map((r: any) => [r.release_type, r._count])),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[GET /api/ai/analytics]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
