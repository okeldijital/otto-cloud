import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, orgContextErrorResponse } from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  createAmendmentDraft,
  getAmendmentDraft,
  updateAmendmentDraft,
  type AmendmentDraftContent,
} from "@/lib/contract-lifecycle/amendment-draft-service";

function parseId(value: string) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function response(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data, message: null, errors: null }, { status });
}

function failure(error: unknown) {
  if (error instanceof IntelligenceError) {
    return NextResponse.json({ success: false, data: null, message: error.message, errors: [error.message], code: error.code }, { status: error.status });
  }
  const org = orgContextErrorResponse(error);
  if (org) return NextResponse.json(org.body, { status: org.status });
  console.error("[amendment draft]", error);
  return NextResponse.json({ success: false, data: null, message: "Unable to process amendment draft", errors: ["Unable to process amendment draft"], code: "INTERNAL_ERROR" }, { status: 500 });
}

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string; amendmentId: string }> | { id: string; amendmentId: string } }) {
  try {
    const ctx = await requireOrganization();
    const p = await Promise.resolve(context.params);
    const contractId = parseId(p.id);
    if (!contractId) return response({ error: "Invalid contract id" }, 400);
    return response({ draft: await getAmendmentDraft({ organizationId: ctx.organizationId, contractId, amendmentId: p.amendmentId }) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string; amendmentId: string }> | { id: string; amendmentId: string } }) {
  try {
    const ctx = await requireOrganization();
    const p = await Promise.resolve(context.params);
    const contractId = parseId(p.id);
    if (!contractId) return response({ error: "Invalid contract id" }, 400);
    return response(await createAmendmentDraft({ ctx, organizationId: ctx.organizationId, contractId, amendmentId: p.amendmentId }), 201);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string; amendmentId: string }> | { id: string; amendmentId: string } }) {
  try {
    const ctx = await requireOrganization();
    const p = await Promise.resolve(context.params);
    const contractId = parseId(p.id);
    if (!contractId) return response({ error: "Invalid contract id" }, 400);
    const body = (await req.json()) as { content?: AmendmentDraftContent };
    if (!body.content || typeof body.content !== "object") return response({ error: "Draft content is required" }, 400);
    return response({ draft: await updateAmendmentDraft({ ctx, organizationId: ctx.organizationId, contractId, amendmentId: p.amendmentId, content: body.content }) });
  } catch (error) {
    return failure(error);
  }
}
