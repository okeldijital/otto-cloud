import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const subscription = await prisma.subscriptions.findFirst({
      where: { organization_id: orgId },
      include: { plans: true },
    });

    return NextResponse.json(subscription);
  } catch (err: any) {
    console.error("[GET /api/subscriptions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await req.json();
    const planId = body.plan_id;

    if (!planId) return NextResponse.json({ error: "plan_id is required" }, { status: 400 });

    const plan = await prisma.plans.findUnique({ where: { id: planId } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const existing = await prisma.subscriptions.findFirst({
      where: { organization_id: orgId },
    });

    if (existing) {
      const updated = await prisma.subscriptions.update({
        where: { id: existing.id },
        data: {
          plan_id: planId,
          status: "active",
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        include: { plans: true },
      });
      return NextResponse.json(updated);
    }

    const subscription = await prisma.subscriptions.create({
      data: {
        organization_id: orgId,
        plan_id: planId,
        status: "active",
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      include: { plans: true },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/subscriptions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await req.json();
    const { plan_id } = body;

    if (!plan_id) return NextResponse.json({ error: "plan_id is required" }, { status: 400 });

    const plan = await prisma.plans.findUnique({ where: { id: plan_id } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const existing = await prisma.subscriptions.findFirst({
      where: { organization_id: orgId },
    });
    if (!existing) return NextResponse.json({ error: "No active subscription" }, { status: 404 });

    const updated = await prisma.subscriptions.update({
      where: { id: existing.id },
      data: { plan_id },
      include: { plans: true },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/subscriptions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
