import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import {
  requireLegacyIntOrgId,
  requireActorUserId,
  requirePositiveIntId,
  requireContractInOrg,
  requireReleaseInOrg,
  requireAIContractDocumentInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";
import { requireLegacyActorUserId } from "@/lib/auth/legacy-user-bridge";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgId = requireLegacyIntOrgId(ctx);
    if (action === "health") return NextResponse.json({ enabled: true, version: "core_write_v1_deterministic" });
    if (action === "proposals") {
      const id = searchParams.get("id");
      if (id) {
        const run = await prisma.ai_core_write_proposal_runs.findFirst({
          where: { id: parseInt(id), organization_id: orgId },
          include: { ai_core_write_proposal_items: true, ai_core_write_apply_events: true },
        });
        if (!run) return NextResponse.json({ error: "Proposal run not found" }, { status: 404 });
        return NextResponse.json(run);
      }
      return NextResponse.json(await prisma.ai_core_write_proposal_runs.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        include: { _count: { select: { ai_core_write_proposal_items: true, ai_core_write_apply_events: true } } },
      }));
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400) return NextResponse.json(mapped.body, { status: mapped.status });
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    console.error("[GET /api/ai/core-write]", err);
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
    const orgId = requireLegacyIntOrgId(ctx);
    const userId = ctx.userId > 0 ? requireActorUserId(ctx) : await requireLegacyActorUserId(ctx, session.user.email);

    if (action === "propose") {
      const body = await req.json();
      const { contract_id, release_id, contract_document_id } = body;
      const contractId = requirePositiveIntId(contract_id, "contract_id");
      await requireContractInOrg(contractId, ctx);
      let releaseId: number | null = null;
      if (release_id !== undefined && release_id !== null && release_id !== "") {
        releaseId = requirePositiveIntId(release_id, "release_id");
        await requireReleaseInOrg(releaseId, ctx);
      }
      let contractDocumentId: number | null = null;
      if (contract_document_id !== undefined && contract_document_id !== null && contract_document_id !== "") {
        contractDocumentId = requirePositiveIntId(contract_document_id, "contract_document_id");
        await requireAIContractDocumentInOrg(contractDocumentId, ctx);
      }
      const run = await prisma.ai_core_write_proposal_runs.create({
        data: {
          organization_id: orgId,
          user_id: userId,
          contract_id: contractId,
          release_id: releaseId,
          contract_document_id: contractDocumentId,
          request_hash: `propose-${Date.now()}`,
          parser_version: "v1",
          linker_version: "v1",
          planner_version: "v1",
          ai_core_write_proposal_items: {
            create: [{ organization_id: orgId, entity_type: "contract", entity_id: contractId, operation: "update", patch_json: JSON.stringify({ status: "Active" }), requires_user_review: true }],
          },
        },
        include: { ai_core_write_proposal_items: true },
      });
      return NextResponse.json(run, { status: 201 });
    }

    if (action === "apply") {
      const body = await req.json();
      const runId = requirePositiveIntId(body.run_id, "run_id");
      const run = await prisma.ai_core_write_proposal_runs.findFirst({ where: { id: runId, organization_id: orgId }, include: { ai_core_write_proposal_items: true } });
      if (!run) return NextResponse.json({ error: "Proposal run not found" }, { status: 404 });
      const applyEvent = await prisma.ai_core_write_apply_events.create({
        data: {
          organization_id: orgId,
          user_id: userId,
          run_id: run.id,
          request_hash: `apply-${Date.now()}`,
          status: "applied",
          applied_count: run.ai_core_write_proposal_items.length,
          created_count: 0,
          conflict_count: 0,
        },
      });
      return NextResponse.json(applyEvent, { status: 201 });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 400 || mapped.status === 404) return NextResponse.json(mapped.body, { status: mapped.status });
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    console.error("[POST /api/ai/core-write]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
