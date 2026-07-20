import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgIdStr = ctx.organizationId;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;

    if (action === "health") {
      return NextResponse.json({ enabled: true, version: "core_write_v1_deterministic" });
    }

    if (action === "proposals") {
      const id = searchParams.get("id");
      if (id) {
        const run = await prisma.ai_core_write_proposal_runs.findFirst({
          where: { id: parseInt(id), organization_id: orgId },
          include: {
            ai_core_write_proposal_items: true,
            ai_core_write_apply_events: true,
          },
        });
        if (!run) return NextResponse.json({ error: "Proposal run not found" }, { status: 404 });
        return NextResponse.json(run);
      }

      const runs = await prisma.ai_core_write_proposal_runs.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        include: { _count: { select: { ai_core_write_proposal_items: true, ai_core_write_apply_events: true } } },
      });
      return NextResponse.json(runs);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[GET /api/ai/core-write]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgIdStr = ctx.organizationId;
    const orgId = typeof orgIdStr === "string" ? parseInt(orgIdStr) || 1 : orgIdStr;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "propose") {
      const body = await req.json();
      const { contract_id, release_id, contract_document_id } = body;

      const run = await prisma.ai_core_write_proposal_runs.create({
        data: {
          organization_id: orgId,
          user_id: userId,
          contract_id: parseInt(contract_id),
          release_id: release_id ? parseInt(release_id) : null,
          contract_document_id: contract_document_id ? parseInt(contract_document_id) : null,
          request_hash: `propose-${Date.now()}`,
          parser_version: "v1",
          linker_version: "v1",
          planner_version: "v1",
          ai_core_write_proposal_items: {
            create: [
              {
                organization_id: orgId,
                entity_type: "contract",
                entity_id: parseInt(contract_id),
                operation: "update",
                patch_json: JSON.stringify({ status: "Active" }),
                requires_user_review: true,
              },
            ],
          },
        },
        include: { ai_core_write_proposal_items: true },
      });
      return NextResponse.json(run, { status: 201 });
    }

    if (action === "apply") {
      const body = await req.json();
      const { run_id } = body;

      const run = await prisma.ai_core_write_proposal_runs.findFirst({
        where: { id: parseInt(run_id), organization_id: orgId },
        include: { ai_core_write_proposal_items: true },
      });
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
  } catch (err: any) {
    console.error("[POST /api/ai/core-write]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
