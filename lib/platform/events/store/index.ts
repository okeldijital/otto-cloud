import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import type {
  EventStatus,
  PlatformEventRecord,
  ProcessingStep,
  PublishEventInput,
} from "../types";
import { requireEventDefinition } from "../registry";

function asRecord(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function asHistory(v: unknown): ProcessingStep[] {
  if (Array.isArray(v)) return v as ProcessingStep[];
  return [];
}

export function toEventRecord(row: any): PlatformEventRecord {
  return {
    id: row.id,
    eventName: row.eventName,
    version: row.version,
    producer: row.producer,
    organizationId: row.organizationId,
    payload: asRecord(row.payload),
    metadata: row.metadata == null ? null : asRecord(row.metadata),
    occurredAt: row.occurredAt,
    publishedAt: row.publishedAt,
    status: row.status as EventStatus,
    retryCount: row.retryCount,
    correlationId: row.correlationId,
    causationId: row.causationId,
    parentEventId: row.parentEventId,
    processingHistory: asHistory(row.processingHistory),
    actorUserId: row.actorUserId,
    entityType: row.entityType,
    entityId: row.entityId,
  };
}

export async function persistEvent(
  input: PublishEventInput
): Promise<PlatformEventRecord> {
  const def = requireEventDefinition(input.eventName);
  const now = new Date();
  const correlationId = input.correlationId || randomUUID();
  const history: ProcessingStep[] = [
    {
      at: now.toISOString(),
      action: "persisted",
      detail: { producer: input.producer || def.producer },
    },
  ];

  const row = await prisma.platformEvent.create({
    data: {
      eventName: input.eventName,
      version: input.version || def.version,
      producer: input.producer || def.producer,
      organizationId: input.organizationId,
      payload: input.payload as object,
      metadata: (input.metadata ?? {}) as object,
      occurredAt: input.occurredAt || now,
      publishedAt: now,
      status: "pending",
      correlationId,
      causationId: input.causationId ?? null,
      parentEventId: input.parentEventId ?? null,
      processingHistory: history as object,
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType ?? null,
      entityId:
        input.entityId != null && input.entityId !== ""
          ? String(input.entityId)
          : null,
    },
  });

  return toEventRecord(row);
}

export async function appendProcessingStep(
  eventId: string,
  step: ProcessingStep,
  status?: EventStatus,
  extra?: { retryCount?: number }
): Promise<void> {
  const current = await prisma.platformEvent.findUnique({
    where: { id: eventId },
    select: { processingHistory: true },
  });
  if (!current) return;
  const history = asHistory(current.processingHistory);
  history.push(step);
  await prisma.platformEvent.update({
    where: { id: eventId },
    data: {
      processingHistory: history as object,
      ...(status ? { status } : {}),
      ...(extra?.retryCount != null ? { retryCount: extra.retryCount } : {}),
    },
  });
}

export async function getEventById(
  id: string,
  organizationId?: string
): Promise<PlatformEventRecord | null> {
  const row = await prisma.platformEvent.findFirst({
    where: {
      id,
      ...(organizationId ? { organizationId } : {}),
    },
  });
  return row ? toEventRecord(row) : null;
}

export async function listEvents(params: {
  organizationId: string;
  eventName?: string;
  status?: string;
  correlationId?: string;
  producer?: string;
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: any = { organizationId: params.organizationId };
  if (params.eventName) where.eventName = params.eventName;
  if (params.status) where.status = params.status;
  if (params.correlationId) where.correlationId = params.correlationId;
  if (params.producer) where.producer = params.producer;
  if (params.from || params.to) {
    where.publishedAt = {};
    if (params.from) where.publishedAt.gte = params.from;
    if (params.to) where.publishedAt.lte = params.to;
  }

  const take = Math.min(params.limit ?? 50, 200);
  const skip = params.offset ?? 0;

  const [items, total] = await Promise.all([
    prisma.platformEvent.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take,
      skip,
    }),
    prisma.platformEvent.count({ where }),
  ]);

  return {
    items: items.map(toEventRecord),
    total,
    limit: take,
    offset: skip,
  };
}
