/**
 * ProjectionStore — checkpoint persistence for rebuild/replay progress.
 */

import { prisma } from "@/lib/prisma";
import type { ProjectionCheckpoint } from "./types";
import { incProjectionMetric } from "./metrics";

export async function getCheckpoint(params: {
  projectionName: string;
  organizationId: string;
}): Promise<ProjectionCheckpoint | null> {
  const row = await prisma.platformProjectionCheckpoint.findUnique({
    where: {
      projectionName_organizationId: {
        projectionName: params.projectionName,
        organizationId: params.organizationId,
      },
    },
  });
  return row ? toCheckpoint(row) : null;
}

export async function upsertCheckpoint(params: {
  projectionName: string;
  organizationId: string;
  lastEventId?: string | null;
  lastEventName?: string | null;
  lastEventPublishedAt?: Date | null;
  status?: ProjectionCheckpoint["status"];
  lastError?: string | null;
  lastRebuildAt?: Date | null;
  incrementProcessed?: number;
  incrementFailures?: number;
}): Promise<ProjectionCheckpoint> {
  const existing = await prisma.platformProjectionCheckpoint.findUnique({
    where: {
      projectionName_organizationId: {
        projectionName: params.projectionName,
        organizationId: params.organizationId,
      },
    },
  });

  const processed =
    (existing?.processedCount ?? 0) + (params.incrementProcessed ?? 0);
  const failures =
    (existing?.failureCount ?? 0) + (params.incrementFailures ?? 0);

  const row = await prisma.platformProjectionCheckpoint.upsert({
    where: {
      projectionName_organizationId: {
        projectionName: params.projectionName,
        organizationId: params.organizationId,
      },
    },
    create: {
      projectionName: params.projectionName,
      organizationId: params.organizationId,
      lastEventId: params.lastEventId ?? null,
      lastEventName: params.lastEventName ?? null,
      lastEventPublishedAt: params.lastEventPublishedAt ?? null,
      status: params.status ?? "idle",
      lastError: params.lastError ?? null,
      lastRebuildAt: params.lastRebuildAt ?? null,
      processedCount: params.incrementProcessed ?? 0,
      failureCount: params.incrementFailures ?? 0,
    },
    update: {
      ...(params.lastEventId !== undefined
        ? { lastEventId: params.lastEventId }
        : {}),
      ...(params.lastEventName !== undefined
        ? { lastEventName: params.lastEventName }
        : {}),
      ...(params.lastEventPublishedAt !== undefined
        ? { lastEventPublishedAt: params.lastEventPublishedAt }
        : {}),
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.lastError !== undefined ? { lastError: params.lastError } : {}),
      ...(params.lastRebuildAt !== undefined
        ? { lastRebuildAt: params.lastRebuildAt }
        : {}),
      processedCount: processed,
      failureCount: failures,
    },
  });

  incProjectionMetric("checkpoints_written");
  return toCheckpoint(row);
}

export async function listCheckpoints(params: {
  organizationId?: string;
  projectionName?: string;
}) {
  const where: any = {};
  if (params.organizationId) where.organizationId = params.organizationId;
  if (params.projectionName) where.projectionName = params.projectionName;
  const rows = await prisma.platformProjectionCheckpoint.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toCheckpoint);
}

function toCheckpoint(row: any): ProjectionCheckpoint {
  return {
    projectionName: row.projectionName,
    organizationId: row.organizationId,
    lastEventId: row.lastEventId,
    lastEventName: row.lastEventName,
    lastEventPublishedAt: row.lastEventPublishedAt,
    status: row.status,
    lastError: row.lastError,
    lastRebuildAt: row.lastRebuildAt,
    processedCount: row.processedCount,
    failureCount: row.failureCount,
    updatedAt: row.updatedAt,
  };
}
