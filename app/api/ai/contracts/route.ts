import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import {
  requireActorUserId,
  requireEntityReferenceInOrg,
  requirePositiveIntId,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

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
    // R5: actor identity is server-derived; the old parseInt(session.user.id)||1
    // fallback (R6 family) is removed — never invent user id 1.
    const userId = requireActorUserId(ctx);

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

      // R5: run_id is validated (malformed → 400, never id-coerced) and the run
      // must belong to the caller's organization (foreign → 404).
      const runId = requirePositiveIntId(run_id, "run_id");
      const existingRun = await prisma.ai_contract_resolution_runs.findFirst({
        where: { id: runId, organization_id: orgId },
      });
      if (!existingRun) return NextResponse.json({ error: "Run not found" }, { status: 404 });

      // R5: each client-supplied entity reference must resolve to a positive
      // integer owned by the caller's organization (404 foreign/non-existent;
      // null references remain valid; unknown entity types fail closed 400).
      const created = await Promise.all(
        (links || []).map(async (link: any) => {
          const entityId = await requireEntityReferenceInOrg(
            link.entity_type,
            link.entity_id,
            ctx
          );
          return prisma.ai_contract_resolution_links.create({
            data: {
              run_id: runId,
              entity_type: link.entity_type,
              entity_id: entityId,
              action: link.action,
              confidence: link.confidence ? parseInt(link.confidence) : null,
              rationale: link.rationale || null,
            },
          });
        })
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
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (
      mapped.status === 401 ||
      mapped.status === 403 ||
      mapped.status === 400 ||
      mapped.status === 404
    ) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[POST /api/ai/contracts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
