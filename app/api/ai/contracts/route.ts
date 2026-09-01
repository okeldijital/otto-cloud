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
import { documentIntelligenceService } from "@/lib/document-intelligence";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;

    if (action === "extraction_status") {
      const documentId = searchParams.get("document_id");
      const jobId = searchParams.get("job_id") || undefined;
      if (!documentId) return NextResponse.json({ error: "Missing document_id" }, { status: 400 });
      const status = await documentIntelligenceService.getJobStatus({ organizationId: orgId, documentId, jobId });
      return NextResponse.json(status);
    }

    if (action === "extraction_result") {
      const documentId = searchParams.get("document_id");
      const extractionId = searchParams.get("extraction_id") || undefined;
      if (!documentId) return NextResponse.json({ error: "Missing document_id" }, { status: 400 });
      const result = await documentIntelligenceService.getExtractionResult({ organizationId: orgId, documentId, extractionId });
      return NextResponse.json(result);
    }

    if (action === "verification_begin") {
      const extractionId = searchParams.get("extraction_id");
      if (!extractionId) return NextResponse.json({ error: "Missing extraction_id" }, { status: 400 });
      const draft = await documentIntelligenceService.beginVerification({
        organizationId: orgId,
        extractionId,
        userId: requireActorUserId(ctx),
      });
      return NextResponse.json(draft, { status: 201 });
    }

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
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: err?.status || 500 });
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
    const userId = requireActorUserId(ctx);

    if (action === "extract") {
      const body = await req.json();
      const documentId = body.document_id ?? body.documentId;
      const contractIdValue = body.contract_id ?? body.contractId;
      if (!documentId || typeof documentId !== "string") return NextResponse.json({ error: "Missing document_id" }, { status: 400 });
      const contractId = contractIdValue == null ? null : requirePositiveIntId(contractIdValue, "contract_id");
      const job = await documentIntelligenceService.startExtraction({ organizationId: orgId, documentId, contractId, userId });
      return NextResponse.json(job, { status: 202 });
    }

    if (action === "verification_begin") {
      const body = await req.json().catch(() => ({}));
      const extractionId = body.extraction_id ?? body.extractionId;
      if (!extractionId || typeof extractionId !== "string") return NextResponse.json({ error: "Missing extraction_id" }, { status: 400 });
      const draft = await documentIntelligenceService.beginVerification({ organizationId: orgId, extractionId, userId });
      return NextResponse.json(draft, { status: 201 });
    }

    if (action === "resolve") {
      const body = await req.json();
      const { run_id, links } = body;
      const runId = requirePositiveIntId(run_id, "run_id");
      const existingRun = await prisma.ai_contract_resolution_runs.findFirst({ where: { id: runId, organization_id: orgId } });
      if (!existingRun) return NextResponse.json({ error: "Run not found" }, { status: 404 });
      const created = await Promise.all((links || []).map(async (link: any) => {
        const entityId = await requireEntityReferenceInOrg(link.entity_type, link.entity_id, ctx);
        return prisma.ai_contract_resolution_links.create({ data: { run_id: runId, entity_type: link.entity_type, entity_id: entityId, action: link.action, confidence: link.confidence ? parseInt(link.confidence) : null, rationale: link.rationale || null } });
      }));
      return NextResponse.json(created, { status: 201 });
    }

    if (action === "link_suggest") {
      const body = await req.json();
      const { contract_hash } = body;
      const keywords = (contract_hash || "").replace(/[_-]/g, " ").split(/\s+/).filter(Boolean);
      const nameFilters = keywords.length > 0 ? keywords.map((k: string) => ({ name: { contains: k, mode: "insensitive" as const } })) : [];
      const artists = nameFilters.length > 0 ? await prisma.artists.findMany({ where: { OR: nameFilters, organization_id: orgId }, take: 10 }) : [];
      return NextResponse.json({ suggestions: artists.map((a: any) => ({ entity_type: "artist", entity_id: a.id, display_name: a.name, action: "link", confidence: 75, rationale: "Name match from contract_hash keywords" })) });
    }

    if (action === "track_map_plan") {
      const body = await req.json();
      const plan = await prisma.ai_contract_resolution_runs.create({ data: { organization_id: orgId, user_id: userId, contract_hash: body.contract_hash || "manual-map", extractor_version: "map_plan", linker_version: "v1" } });
      return NextResponse.json({ run_id: plan.id, plan: "track_map_plan_created" }, { status: 201 });
    }

    if (action === "intake_wizard") {
      return NextResponse.json({ steps: [
        { step: 1, name: "Upload Document", description: "Upload the contract document for extraction" },
        { step: 2, name: "Extract Fields", description: "AI extracts key fields from the document" },
        { step: 3, name: "Resolve Entities", description: "Map extracted entities to your catalog" },
        { step: 4, name: "Link to Release", description: "Associate the contract with a release" },
        { step: 5, name: "Review & Approve", description: "Review AI suggestions and finalize" },
      ] });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if ([401, 403, 400, 404].includes(mapped.status)) return NextResponse.json(mapped.body, { status: mapped.status });
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    console.error("[POST /api/ai/contracts]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}