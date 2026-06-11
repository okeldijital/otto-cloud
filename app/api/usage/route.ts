import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_METRICS = ["storage_mb", "team_members", "tracks", "releases", "ai_tokens"] as const;

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const metric = searchParams.get("metric");
    const period = searchParams.get("period") || "monthly";

    const where: any = { organization_id: orgId, period };
    if (metric) where.metric = metric;

    const records = await prisma.usage.findMany({ where });

    if (metric) {
      const match = records.find((r) => r.metric === metric);
      return NextResponse.json({ metric, value: match?.value ?? 0, period });
    }

    const result: Record<string, number> = {};
    for (const r of records) result[r.metric] = r.value;
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[GET /api/usage]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = (session.user as any).organization_id;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await req.json();
    const { metric, value = 1, period = "monthly", tokens_used = 0 } = body;

    if (!VALID_METRICS.includes(metric)) {
      return NextResponse.json({ error: `Invalid metric. Valid: ${VALID_METRICS.join(", ")}` }, { status: 400 });
    }

    const existing = await prisma.usage.findFirst({
      where: { organization_id: orgId, metric, period },
    });

    if (existing) {
      const updated = await prisma.usage.update({
        where: { id: existing.id },
        data: {
          value: existing.value + value,
          tokens_used: existing.tokens_used + BigInt(tokens_used),
        },
      });
      return NextResponse.json(updated);
    }

    const record = await prisma.usage.create({
      data: { organization_id: orgId, metric, value, period, tokens_used: BigInt(tokens_used) },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/usage]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
