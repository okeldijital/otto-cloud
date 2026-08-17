import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { requireOrganization } from "@/lib/auth/organization-context";
import { requireActorUserId, requirePositiveIntId, resourceAuthErrorResponse } from "@/lib/auth/resource-authorization";
import { requireAIEntityInOrg } from "@/lib/auth/ai-entity-authorization";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url); const action = searchParams.get("action"); const ctx = await requireOrganization(); const orgId = ctx.organizationId;
    if (action === "extract") {
      const id = searchParams.get("id"); if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const run = await prisma.ai_contract_resolution_runs.findFirst({ where: { id: requirePositiveIntId(id), organization_id: orgId }, include: { ai_contract_resolution_links: true, contract_intake_release_links: true } });
      if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 }); return NextResponse.json(run);
    }
    return NextResponse.json(await prisma.ai_contract_resolution_runs.findMany({ where: { organization_id: orgId }, orderBy: { created_at: "desc" }, include: { _count: { select: { ai_contract_resolution_links: true } } } }));
  } catch (err: unknown) { const mapped = resourceAuthErrorResponse(err); if (mapped.status <= 403) return NextResponse.json(mapped.body, { status: mapped.status }); console.error("[GET /api/ai/contracts]", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(); if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url); const action = searchParams.get("action"); const ctx = await requireOrganization(); const orgId = ctx.organizationId; const userId = requireActorUserId(ctx);
    if (action === "extract") {
      const body = await req.json(); const run = await prisma.ai_contract_resolution_runs.create({ data: { organization_id: orgId, user_id: userId, contract_hash: body.contract_hash, extractor_version: body.extractor_version || "v1", linker_version: body.linker_version || "v1" } }); return NextResponse.json(run, { status: 201 });
    }
    if (action === "resolve") {
      const body = await req.json(); const runId = requirePositiveIntId(body.run_id, "run_id");
      const existingRun = await prisma.ai_contract_resolution_runs.findFirst({ where: { id: runId, organization_id: orgId } }); if (!existingRun) return NextResponse.json({ error: "Run not found" }, { status: 404 });
      const normalizedLinks = await Promise.all((Array.isArray(body.links) ? body.links : []).map(async (link: any) => {
        const entityType = String(link?.entity_type ?? "").trim(); if (!entityType) throw new (require("@/lib/auth/resource-authorization").ResourceAuthError)("entity_type is required", 400, "VALIDATION_ERROR");
        if (link?.entity_id === undefined || link?.entity_id === null || link?.entity_id === "") return { entity_type: entityType, entity_id: null, action: link.action, confidence: link.confidence, rationale: link.rationale || null };
        const entity = await requireAIEntityInOrg(entityType, link.entity_id, ctx);
        return { entity_type: entity.entityType, entity_id: entity.entityId, action: link.action, confidence: link.confidence ?? null, rationale: link.rationale || null };
      });
      const created = await Promise.all(normalizedLinks.map((link) => prisma.ai_contract_resolution_links.create({ data: { run_id: runId, entity_type: link.entity_type, entity_id: link.entity_id, action: link.action, confidence: link.confidence, rationale: link.rationale } })));
      return NextResponse.json(created, { status: 201 });
    }
    if (action === "link_suggest") {
      const body = await req.json(); const keywords = (body.contract_hash || "").replace(/[_-]/g, " ").split(/\s+/).filter(Boolean); const nameFilters = keywords.length ? keywords.map((k: string) => ({ name: { contains: k, mode: "insensitive" as const } })) : []; const artists = nameFilters.length ? await prisma.artists.findMany({ where: { OR: nameFilters, organization_id: orgId }, take: 10 }) : []; return NextResponse.json({ suggestions: artists.map((a: any) => ({ entity_type: "artist", entity_id: a.id, display_name: a.name, action: "link", confidence: 75, rationale: "Name match from contract_hash keywords" })) });
    }
    if (action === "track_map_plan") { const body = await req.json(); const plan = await prisma.ai_contract_resolution_runs.create({ data: { organization_id: orgId, user_id: userId, contract_hash: body.contract_hash || "manual-map", extractor_version: "map_plan", linker_version: "v1" } }); return NextResponse.json({ run_id: plan.id, plan: "track_map_plan_created" }, { status: 201 }); }
    if (action === "intake_wizard") return NextResponse.json({ steps: [{ step: 1, name: "Upload Document", description: "Upload the contract document for extraction" }, { step: 2, name: "Extract Fields", description: "AI extracts key fields from the document" }, { step: 3, name: "Resolve Entities", description: "Map extracted entities to your catalog" }, { step: 4, name: "Link to Release", description: "Associate the contract with a release" }, { step: 5, name: "Review & Approve", description: "Review AI suggestions and finalize" }] });
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) { const mapped = resourceAuthErrorResponse(err); if (mapped.status <= 403) return NextResponse.json(mapped.body, { status: mapped.status }); console.error("[POST /api/ai/contracts]", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
