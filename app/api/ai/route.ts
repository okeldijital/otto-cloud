import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { complete } from "@/lib/ai-provider";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgId = (session.user as any).organization_id;

    const action = searchParams.get("action");

    if (action === "health") {
      return NextResponse.json({
        status: "ok",
        tools: {
          analytics: { enabled: true },
          contracts: { enabled: true },
          core_write: { enabled: true },
          release_integration: { enabled: true },
          royalty: { enabled: true },
          audit: { enabled: true },
          draft: { enabled: true },
        },
      });
    }

    if (action === "sessions") {
      const id = searchParams.get("id");
      if (id) {
        const sessionId = parseInt(id);
        const aiSession = await prisma.ai_sessions.findFirst({
          where: { id: sessionId, organization_id: orgId },
          include: { ai_messages: { orderBy: { created_at: "asc" } } },
        });
        if (!aiSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
        return NextResponse.json(aiSession);
      }

      const sessions = await prisma.ai_sessions.findMany({
        where: { organization_id: orgId },
        orderBy: { created_at: "desc" },
        include: { _count: { select: { ai_messages: true } } },
      });
      return NextResponse.json(sessions);
    }

    if (action === "tools") {
      return NextResponse.json({
        tools: [
          { name: "ai_analytics", description: "AI-powered analytics and insights" },
          { name: "ai_contracts", description: "Contract extraction and resolution" },
          { name: "ai_core_write", description: "AI-assisted core write proposals" },
          { name: "ai_release_integration", description: "Release integration and entity linking" },
          { name: "ai_royalty", description: "Royalty simulation and split validation" },
          { name: "ai_audit", description: "Catalog consistency, release quality, royalty anomaly, contract audit checks" },
          { name: "ai_draft", description: "Contract drafting assistant with review-first workflow" },
        ],
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[GET /api/ai]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const orgId = (session.user as any).organization_id;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "chat") {
      const body = await req.json();
      const { session_id, content, role } = body;

      let aiSession;
      if (session_id) {
        aiSession = await prisma.ai_sessions.findFirst({
          where: { id: parseInt(session_id), organization_id: orgId },
        });
        if (!aiSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      } else {
        aiSession = await prisma.ai_sessions.create({
          data: { organization_id: orgId, user_id: userId },
        });
      }

      await prisma.ai_messages.create({
        data: {
          session_id: aiSession.id,
          role: role || "user",
          content: content,
        },
      });

      const prevMessages = await prisma.ai_messages.findMany({
        where: { session_id: aiSession.id },
        orderBy: { created_at: "asc" },
        take: 10,
      });

      const ctx = prevMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
      const result = await complete({
        systemPrompt: "You are an AI assistant for a music label management platform called OTTO Cloud. You help with contract extraction, catalog management, royalty analysis, reporting, and general label operations. Be concise and helpful.",
        userPrompt: `${ctx}\n\nuser: ${content}\n\nassistant:`,
        maxTokens: 256,
      });

      await prisma.ai_messages.create({
        data: {
          session_id: aiSession.id,
          role: "assistant",
          content: result.text,
        },
      });

      const updatedSession = await prisma.ai_sessions.findFirst({
        where: { id: aiSession.id },
        include: { ai_messages: { orderBy: { created_at: "asc" } } },
      });

      return NextResponse.json(updatedSession, { status: 201 });
    }

    if (action === "archive") {
      const body = await req.json();
      const id = parseInt(body.id);
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

      const existing = await prisma.ai_sessions.findFirst({
        where: { id, organization_id: orgId },
      });
      if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });

      await prisma.ai_messages.deleteMany({ where: { session_id: id } });
      await prisma.ai_sessions.delete({ where: { id } });

      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/ai]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
