import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/ai-provider";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "draft") {
      const body = await req.json();
      const { label, parties, territory, term_months, royalty_rate, advance_amount, notes } = body;

      const userPrompt = [
        `Draft a music recording contract with the following terms:`,
        `- Label/Working Title: ${label || "Not specified"}`,
        `- Parties: ${parties || "Not specified"}`,
        `- Territory: ${territory || "Worldwide"}`,
        `- Term: ${term_months || "12"} months`,
        `- Royalty Rate: ${royalty_rate || "Standard"}`,
        `- Advance Amount: ${advance_amount || "TBD"}`,
        `- Additional Notes: ${notes || "None"}`,
      ].join("\n");

      const result = await complete({
        systemPrompt: "You are a contract drafting assistant for a music label. Generate clear, professional contract clauses. Always include a disclaimer that this is a draft requiring legal review.",
        userPrompt,
      });

      const draftId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await prisma.ai_contract_drafts.create({
        data: {
          id: draftId,
          organization_id: orgId,
          created_by: userId,
          source: "ai_assistant",
          file_path: `/contracts/drafts/${draftId}.md`,
          file_name: `${label?.replace(/\s+/g, "_").toLowerCase() || "contract"}_draft.md`,
          file_hash: draftId,
          size_bytes: Buffer.byteLength(result.text, "utf-8"),
          extraction_json: JSON.stringify({ draft_text: result.text, provider: result.provider }),
          suggested_defaults_json: JSON.stringify({
            label,
            parties,
            territory: territory || "Worldwide",
            term_months: term_months || 12,
            royalty_rate: royalty_rate || "TBD",
            advance_amount: advance_amount || "TBD",
          }),
        },
      });

      return NextResponse.json({
        draft_id: draftId,
        provider: result.provider,
        content: result.text,
        disclaimer: "This is an AI-generated draft for review purposes only. It is not a legally binding document. Legal review is required before execution.",
      }, { status: 201 });
    }

    if (action === "list") {
      const drafts = await prisma.ai_contract_drafts.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        take: 50,
      });
      return NextResponse.json(drafts);
    }

    if (action === "get") {
      const body = await req.json();
      const { id } = body;
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const draft = await prisma.ai_contract_drafts.findFirst({
        where: { id, organization_id: orgId },
      });
      if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      const parsed = JSON.parse(draft.extraction_json || "{}");
      return NextResponse.json({ ...draft, parsed_content: parsed.draft_text });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/ai/draft]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    if (action === "list") {
      const drafts = await prisma.ai_contract_drafts.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        take: 50,
      });
      return NextResponse.json(drafts);
    }

    if (action === "get") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const draft = await prisma.ai_contract_drafts.findFirst({
        where: { id, organization_id: orgId },
      });
      if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      const parsed = JSON.parse(draft.extraction_json || "{}");
      return NextResponse.json({ ...draft, parsed_content: parsed.draft_text });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[GET /api/ai/draft]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
