import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const orgIdStr = (session.user as any).organization_id;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;

    if (action === "health") {
      return NextResponse.json({ enabled: true, version: "release_integration_v1" });
    }

    if (action === "plan") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const run = await prisma.ai_release_integration_runs.findFirst({
        where: { id: parseInt(id), organization_id: orgId },
        include: { ai_release_integration_links: true },
      });
      if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
      return NextResponse.json(run);
    }

    const runs = await prisma.ai_release_integration_runs.findMany({
      where: { organization_id: orgId },
      orderBy: { created_at: "desc" },
      include: { _count: { select: { ai_release_integration_links: true } } },
    });
    return NextResponse.json(runs);
  } catch (err: any) {
    console.error("[GET /api/ai/release-integration]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const orgIdStr = (session.user as any).organization_id;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "plan") {
      const body = await req.json();
      const { release_id, contract_id, planner_version } = body;

      const release = await prisma.releases.findFirst({
        where: { id: parseInt(release_id) },
        include: { artists: true, tracks: true },
      });

      const linksData: any[] = [];
      if (release?.artists) {
        linksData.push({
          organization_id: orgId,
          entity_type: "artist",
          entity_id: release.artists.id,
          display_name: release.artists.name,
          action: "attach",
          confidence: 1.0,
          match_strategy: "direct",
          rationale: "Primary artist on release",
        });
      }

      for (const track of release?.tracks || []) {
        linksData.push({
          organization_id: orgId,
          entity_type: "track",
          entity_id: track.id,
          display_name: track.title,
          action: "attach",
          confidence: 1.0,
          match_strategy: "direct",
          rationale: "Track on release",
        });
      }

      const run = await prisma.ai_release_integration_runs.create({
        data: {
          organization_id: orgId,
          user_id: userId,
          release_id: parseInt(release_id),
          contract_id: contract_id ? parseInt(contract_id) : null,
          request_hash: `integrate-${Date.now()}`,
          planner_version: planner_version || "v1",
          ai_release_integration_links: { create: linksData },
        },
        include: { ai_release_integration_links: true },
      });

      return NextResponse.json(run, { status: 201 });
    }

    if (action === "attach") {
      const body = await req.json();
      const { run_id, links } = body;

      const existingRun = await prisma.ai_release_integration_runs.findFirst({
        where: { id: parseInt(run_id), organization_id: orgId },
      });
      if (!existingRun) return NextResponse.json({ error: "Run not found" }, { status: 404 });

      const created = await Promise.all(
        (links || []).map((link: any) =>
          prisma.ai_release_integration_links.create({
            data: {
              organization_id: orgId,
              run_id: parseInt(run_id),
              entity_type: link.entity_type,
              entity_id: link.entity_id ? parseInt(link.entity_id) : null,
              display_name: link.display_name,
              action: link.action || "attach",
              confidence: link.confidence ?? null,
              match_strategy: link.match_strategy || "suggested",
              rationale: link.rationale || null,
            },
          })
        )
      );
      return NextResponse.json(created, { status: 201 });
    }

    if (action === "ingest") {
      const body = await req.json();
      const { run_id } = body;
      return NextResponse.json({ status: "ok", message: "Fully ingested", run_id });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/ai/release-integration]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
