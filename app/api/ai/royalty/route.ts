import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

function computeRequestHash(releaseId: number, contractDocId: number | null): string {
  const raw = `royalty-sim-${releaseId}-${contractDocId ?? "none"}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgIdStr = ctx.organizationId;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;

    if (action === "health") {
      return NextResponse.json({ enabled: true, version: "royalty_sim_v1_deterministic", persist_enabled: true });
    }

    if (action === "runs") {
      const id = searchParams.get("id");
      if (id) {
        const run = await prisma.ai_royalty_simulation_runs.findFirst({
          where: { id: parseInt(id), organization_id: orgId },
        });
        if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
        return NextResponse.json(run);
      }

      const runs = await prisma.ai_royalty_simulation_runs.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
      });
      return NextResponse.json(runs);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[GET /api/ai/royalty]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgIdStr = ctx.organizationId;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "simulate") {
      const body = await req.json();
      const { release_id, contract_document_id, gross_revenue, units, period_start, period_end, persist_result } = body;

      const release = await prisma.releases.findFirst({
        where: { id: parseInt(release_id) },
        include: { artists: true, tracks: true },
      });
      if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

      let contractDoc = null;
      if (contract_document_id) {
        contractDoc = await prisma.ai_contract_documents.findFirst({
          where: { id: parseInt(contract_document_id) },
        });
      }

      const effectiveRevenue = gross_revenue ? Number(gross_revenue) : 100000;

      const parties: { name: string; type: string }[] = [];
      if (release.artists) {
        parties.push({ name: release.artists.name, type: "artist" });
      }
      for (const track of release.tracks || []) {
        parties.push({ name: track.title, type: "track" });
      }
      if (parties.length === 0) {
        parties.push({ name: "Unknown", type: "unknown" });
      }

      const equalPercent = parseFloat((100 / parties.length).toFixed(4));
      const remainder = parseFloat((100 - equalPercent * parties.length).toFixed(4));

      const computedSplits = parties.map((p, i) => ({
        party_display_name: p.name,
        party_type: p.type,
        percent: i === parties.length - 1 ? equalPercent + remainder : equalPercent,
        source: "equal_split",
        confidence: 0.8,
      }));

      const splitsTotal = computedSplits.reduce((s, c) => s + c.percent, 0);

      const results = computedSplits.map((s) => ({
        party_display_name: s.party_display_name,
        percent: s.percent,
        amount: parseFloat(((s.percent / 100) * effectiveRevenue).toFixed(2)),
        rationale: `Equal split among ${parties.length} entities`,
      }));

      const totalEquals100 = Math.abs(splitsTotal - 100) < 0.01;
      const overAllocated = splitsTotal > 100.01;
      const underAllocated = splitsTotal < 99.99;

      const conflicts: { type: string; message: string; entities: string[] }[] = [];
      if (!totalEquals100) {
        conflicts.push({
          type: "split_mismatch",
          message: `Total splits sum to ${splitsTotal.toFixed(2)}%, expected 100%`,
          entities: parties.map((p) => p.name),
        });
      }

      const requestHash = computeRequestHash(parseInt(release_id), contract_document_id ? parseInt(contract_document_id) : null);

      let persisted = false;
      let runId: number | null = null;

      if (persist_result !== false) {
        const existing = await prisma.ai_royalty_simulation_runs.findFirst({
          where: { organization_id: orgId, release_id: parseInt(release_id), request_hash: requestHash },
        });

        if (!existing) {
          const run = await prisma.ai_royalty_simulation_runs.create({
            data: {
              organization_id: orgId,
              user_id: userId,
              release_id: parseInt(release_id),
              contract_document_id: contract_document_id ? parseInt(contract_document_id) : null,
              request_hash: requestHash,
              royalty_version: "royalty_sim_v1_deterministic",
              splits_total: splitsTotal,
              integrity_total_equals_100: totalEquals100,
              integrity_over_allocated: overAllocated,
              integrity_under_allocated: underAllocated,
            },
          });
          runId = run.id;
          persisted = true;
        } else {
          runId = existing.id;
          persisted = true;
        }
      }

      return NextResponse.json({
        status: "ok",
        release_id: parseInt(release_id),
        contract_document_id: contract_document_id ? parseInt(contract_document_id) : null,
        computed_splits: computedSplits,
        results,
        splits_total: splitsTotal,
        integrity: {
          total_equals_100: totalEquals100,
          over_allocated: overAllocated,
          under_allocated: underAllocated,
        },
        conflicts,
        missing_flags: [],
        warnings: [],
        persisted,
        run_id: runId,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/ai/royalty]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
