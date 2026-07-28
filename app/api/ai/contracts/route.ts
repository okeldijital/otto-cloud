import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    if (action === "extract") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const run = await prisma.ai_contract_resolution_runs.findFirst({
        where: { id: parseInt(id), organization_id: orgId },
        include: { ai_contract_resolution_links: true, contract_intake_release_links: true },
      });
      if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
      return NextResponse.json(run);
    }

    const runs = await prisma.ai_contract_resolution_runs.findMany({
      where: { organization_id: orgId },
      orderBy: { created_at: "desc" },
      include: { _count: { select: { ai_contract_resolution_links: true } } },
    });
    return NextResponse.json(runs);
  } catch (err: any) {
    console.error("[GET /api/ai/contracts]", err);
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
    const orgId = ctx.organizationId;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "extract") {
      const body = await req.json();
      const { contract_hash, extractor_version, linker_version } = body;

      const run = await prisma.ai_contract_resolution_runs.create({
        data: {
          organization_id: orgId,
          user_id: userId,
          contract_hash,
          extractor_version: extractor_version || "v1",
          linker_version: linker_version || "v1",
        },
      });
      return NextResponse.json(run, { status: 201 });
    }

    if (action === "resolve") {
      const body = await req.json();
      const { run_id, links } = body;

      const existingRun = await prisma.ai_contract_resolution_runs.findFirst({
        where: { id: parseInt(run_id), organization_id: orgId },
      });
      if (!existingRun) return NextResponse.json({ error: "Run not found" }, { status: 404 });

      const created = await Promise.all(
        (links || []).map((link: any) =>
          prisma.ai_contract_resolution_links.create({
            data: {
              run_id: parseInt(run_id),
              entity_type: link.entity_type,
              entity_id: link.entity_id ? parseInt(link.entity_id) : null,
              action: link.action,
              confidence: link.confidence ? parseInt(link.confidence) : null,
              rationale: link.rationale || null,
            },
          })
        )
      );
      return NextResponse.json(created, { status: 201 });
    }

    if (action === "link_suggest") {
      const body = await req.json();
      const { contract_hash } = body;

      const keywords = (contract_hash || "").replace(/[_-]/g, " ").split(/\s+/).filter(Boolean);
      const nameFilters = keywords.length > 0
        ? keywords.map((k: string) => ({ name: { contains: k, mode: "insensitive" as const } }))
        : [];

      const artists = nameFilters.length > 0
        ? await prisma.artists.findMany({
            where: { OR: nameFilters, organization_id: orgId },
            take: 10,
          })
        : [];

      return NextResponse.json({
        suggestions: [
          ...artists.map((a: any) => ({
            entity_type: "artist",
            entity_id: a.id,
            display_name: a.name,
            action: "link",
            confidence: 75,
            rationale: `Name match from contract_hash keywords`,
          })),
        ],
      });
    }

    if (action === "track_map_plan") {
      const body = await req.json();
      const { contract_hash } = body;

      const plan = await prisma.ai_contract_resolution_runs.create({
        data: {
          organization_id: orgId,
          user_id: userId,
          contract_hash: contract_hash || "manual-map",
          extractor_version: "map_plan",
          linker_version: "v1",
        },
      });
      return NextResponse.json({ run_id: plan.id, plan: "track_map_plan_created" }, { status: 201 });
    }

    if (action === "intake_wizard") {
      return NextResponse.json({
        steps: [
          { step: 1, name: "Upload Document", description: "Upload the contract document for extraction" },
          { step: 2, name: "Extract Fields", description: "AI extracts key fields from the document" },
          { step: 3, name: "Resolve Entities", description: "Map extracted entities to your catalog" },
          { step: 4, name: "Link to Release", description: "Associate the contract with a release" },
          { step: 5, name: "Review & Approve", description: "Review AI suggestions and finalize" },
        ],
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/ai/contracts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
