import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import {
  requireOrgAuth,
  requireEventInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ctx = await requireOrganization();
    const orgIdStr = ctx.organizationId;
    const action = searchParams.get("action");
    if (action === "upcoming") {
      const now = new Date();
      const events = await prisma.events.findMany({
        where: {
          organization_id: orgIdStr,
          is_deleted: false,
          start_datetime: { gte: now },
        },
        orderBy: { start_datetime: "asc" },
        take: 20,
      });
      return NextResponse.json(events);
    }

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const event = await prisma.events.findFirst({
        where: { id, organization_id: orgIdStr, is_deleted: false },
      });
      if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
      return NextResponse.json(event);
    }

    const eventType = searchParams.get("event_type");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const relatedEntityType = searchParams.get("related_entity_type");
    const relatedEntityId = searchParams.get("related_entity_id");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: any = { organization_id: orgIdStr, is_deleted: false };
    if (eventType) where.event_type = eventType;
    if (status) where.status = status;
    if (category) where.category = category;
    if (dateFrom || dateTo) {
      where.start_datetime = {};
      if (dateFrom) where.start_datetime.gte = new Date(dateFrom);
      if (dateTo) where.start_datetime.lte = new Date(dateTo);
    }
    if (relatedEntityType && relatedEntityId) {
      where.related_entity_type = relatedEntityType;
      where.related_entity_id = parseInt(relatedEntityId);
    }

    const events = await prisma.events.findMany({
      where,
      skip,
      take: limit,
      orderBy: { start_datetime: "asc" },
    });
    return NextResponse.json(events);
  } catch (err: any) {
    console.error("[GET /api/office/events]", err);
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
    const orgIdStr = ctx.organizationId;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "create") {
      const body = await req.json();
      const event = await prisma.events.create({
        data: {
          title: body.title,
          description: body.description || undefined,
          start_datetime: new Date(body.start_datetime),
          end_datetime: body.end_datetime ? new Date(body.end_datetime) : undefined,
          all_day: body.all_day || false,
          category: body.category || undefined,
          color: body.color || undefined,
          location: body.location || undefined,
          recurrence_rule: body.recurrence_rule || undefined,
          recurrence_end_date: body.recurrence_end_date ? new Date(body.recurrence_end_date) : undefined,
          reminder_minutes: body.reminder_minutes ? parseInt(body.reminder_minutes) : undefined,
          related_entity_type: body.related_entity_type || undefined,
          related_entity_id: body.related_entity_id ? parseInt(body.related_entity_id) : undefined,
          created_by: userId,
          organization_id: orgIdStr,
          event_type: body.event_type || "Other",
          status: body.status || "Planned",
          is_deleted: false,
        },
      });
      return NextResponse.json(event, { status: 201 });
    }

    const body = await req.json();
    const event = await prisma.events.create({
      data: {
        title: body.title,
        description: body.description || undefined,
        start_datetime: new Date(body.start_datetime),
        end_datetime: body.end_datetime ? new Date(body.end_datetime) : undefined,
        all_day: body.all_day || false,
        category: body.category || undefined,
        color: body.color || undefined,
        location: body.location || undefined,
        recurrence_rule: body.recurrence_rule || undefined,
        recurrence_end_date: body.recurrence_end_date ? new Date(body.recurrence_end_date) : undefined,
        reminder_minutes: body.reminder_minutes ? parseInt(body.reminder_minutes) : undefined,
        related_entity_type: body.related_entity_type || undefined,
        related_entity_id: body.related_entity_id ? parseInt(body.related_entity_id) : undefined,
        created_by: userId,
        organization_id: orgIdStr,
        event_type: body.event_type || "Other",
        status: body.status || "Planned",
        is_deleted: false,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/office/events]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    const id = parseInt(idStr);

    const ctxMut = await requireOrgAuth();
    const existing = await requireEventInOrg(id, ctxMut);
    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.events.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        description: body.description !== undefined ? body.description : undefined,
        start_datetime: body.start_datetime !== undefined ? new Date(body.start_datetime) : undefined,
        end_datetime: body.end_datetime !== undefined ? (body.end_datetime ? new Date(body.end_datetime) : null) : undefined,
        all_day: body.all_day !== undefined ? body.all_day : undefined,
        category: body.category !== undefined ? body.category : undefined,
        color: body.color !== undefined ? body.color : undefined,
        location: body.location !== undefined ? body.location : undefined,
        recurrence_rule: body.recurrence_rule !== undefined ? body.recurrence_rule : undefined,
        recurrence_end_date: body.recurrence_end_date !== undefined ? (body.recurrence_end_date ? new Date(body.recurrence_end_date) : null) : undefined,
        reminder_minutes: body.reminder_minutes !== undefined ? (body.reminder_minutes ? parseInt(body.reminder_minutes) : null) : undefined,
        related_entity_type: body.related_entity_type !== undefined ? body.related_entity_type : undefined,
        related_entity_id: body.related_entity_id !== undefined ? (body.related_entity_id ? parseInt(body.related_entity_id) : null) : undefined,
        event_type: body.event_type !== undefined ? body.event_type : undefined,
        status: body.status !== undefined ? body.status : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[PUT /api/office/events]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing event ID" }, { status: 400 });
    const id = parseInt(idStr);

    const ctxMut = await requireOrgAuth();
    const existing = await requireEventInOrg(id, ctxMut);
    if (!existing) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    await prisma.events.update({
      where: { id },
      data: { is_deleted: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mappedDel = resourceAuthErrorResponse(err);
    if (mappedDel.status === 401 || mappedDel.status === 403 || mappedDel.status === 404) {
      return NextResponse.json(mappedDel.body, { status: mappedDel.status });
    }
    console.error("[DELETE /api/office/events]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
