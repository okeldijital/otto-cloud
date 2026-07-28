/**
 * ReleaseContractSyncService — projects platform contract data into
 * Release Workspace read models. No contract business logic; no writes
 * to Contract Center tables.
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { publishPlatformEvent } from "@/lib/platform/publish";
import { verifiedContractService } from "@/lib/verified-contract";
import {
  computeContractHealth,
  aggregateReleaseHealth,
} from "./health-service";
import {
  RELEASE_CONTRACT_EVENTS,
  TIMELINE_ENTRY_TYPES,
} from "./constants";

export class ReleaseContractSyncService {
  /**
   * Rebuild all contract projections for a release from Relationship Layer.
   */
  async rebuildForRelease(params: {
    organizationId: string;
    releaseId: number;
    sourceEventId?: string | null;
  }) {
    const releaseIdStr = String(params.releaseId);
    const relationships = await prisma.contractRelationship.findMany({
      where: {
        organizationId: params.organizationId,
        targetEntityType: "release",
        targetEntityId: releaseIdStr,
        status: "active",
      },
    });

    const previous = await prisma.releaseContractSummary.findMany({
      where: {
        organizationId: params.organizationId,
        releaseId: params.releaseId,
      },
    });
    const previousHealth = aggregateReleaseHealth(
      previous.map((p) => ({
        status: p.healthStatus as any,
        reasons: Array.isArray(p.healthReasons)
          ? (p.healthReasons as string[])
          : [],
      }))
    );

    const activeContractIds = new Set(relationships.map((r) => r.contractId));

    // Remove projections for unlinked contracts
    for (const prev of previous) {
      if (!activeContractIds.has(prev.contractId)) {
        await prisma.releaseContractSummary.delete({
          where: { id: prev.id },
        });
      }
    }

    const summaries = [];
    for (const rel of relationships) {
      const row = await this.projectOne({
        organizationId: params.organizationId,
        releaseId: params.releaseId,
        contractId: rel.contractId,
        relationshipId: rel.id,
        relationshipType: rel.relationshipType,
        sourceEventId: params.sourceEventId,
      });
      summaries.push(row);
    }

    const health = aggregateReleaseHealth(
      summaries.map((s) => ({
        status: s.healthStatus as any,
        reasons: Array.isArray(s.healthReasons)
          ? (s.healthReasons as string[])
          : [],
      }))
    );

    await publishPlatformEvent({
      eventName: RELEASE_CONTRACT_EVENTS.SummaryUpdated,
      organizationId: params.organizationId,
      producer: "release-workspace",
      entityType: "release",
      entityId: params.releaseId,
      payload: {
        releaseId: params.releaseId,
        contractCount: summaries.length,
        healthStatus: health.status,
      },
      skipDispatch: false,
    });

    if (previousHealth.status !== health.status) {
      await publishPlatformEvent({
        eventName: RELEASE_CONTRACT_EVENTS.HealthChanged,
        organizationId: params.organizationId,
        producer: "release-workspace",
        entityType: "release",
        entityId: params.releaseId,
        payload: {
          releaseId: params.releaseId,
          from: previousHealth.status,
          to: health.status,
          reasons: health.reasons,
        },
      });
    }

    return { summaries, health };
  }

  /**
   * Rebuild all releases linked to a contract (event-driven path).
   */
  async rebuildForContract(params: {
    organizationId: string;
    contractId: number;
    sourceEventId?: string | null;
    timeline?: {
      entryType: string;
      title: string;
      description?: string;
      eventName?: string;
      payload?: Record<string, unknown>;
      occurredAt?: Date;
    };
  }) {
    const relationships = await prisma.contractRelationship.findMany({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        targetEntityType: "release",
        status: "active",
      },
    });

    const releaseIds = [
      ...new Set(
        relationships
          .map((r) => parseInt(r.targetEntityId, 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      ),
    ];

    for (const releaseId of releaseIds) {
      await this.rebuildForRelease({
        organizationId: params.organizationId,
        releaseId,
        sourceEventId: params.sourceEventId,
      });

      if (params.timeline) {
        await this.appendTimeline({
          organizationId: params.organizationId,
          releaseId,
          contractId: params.contractId,
          entryType: params.timeline.entryType,
          title: params.timeline.title,
          description: params.timeline.description,
          sourceEventId: params.sourceEventId,
          sourceEventName: params.timeline.eventName,
          payload: params.timeline.payload,
          occurredAt: params.timeline.occurredAt,
        });
      }
    }

    // If relationship removed, still refresh releases that had this contract
    if (releaseIds.length === 0 && params.timeline) {
      const stale = await prisma.releaseContractSummary.findMany({
        where: {
          organizationId: params.organizationId,
          contractId: params.contractId,
        },
      });
      for (const s of stale) {
        await this.rebuildForRelease({
          organizationId: params.organizationId,
          releaseId: s.releaseId,
          sourceEventId: params.sourceEventId,
        });
      }
    }

    return { releaseIds };
  }

  async projectOne(params: {
    organizationId: string;
    releaseId: number;
    contractId: number;
    relationshipId?: string | null;
    relationshipType?: string | null;
    sourceEventId?: string | null;
  }) {
    const verified = await verifiedContractService.getCurrent({
      organizationId: params.organizationId,
      contractId: params.contractId,
    });

    const lifecycle = await prisma.contractLifecycle.findUnique({
      where: { contractId: params.contractId },
      include: { keyDates: true },
    });

    const relationshipCount = await prisma.contractRelationship.count({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        status: "active",
      },
    });

    const amendmentCount = await prisma.contractAmendment.count({
      where: {
        organizationId: params.organizationId,
        contractId: params.contractId,
      },
    });

    const dateMap = new Map(
      (lifecycle?.keyDates || []).map((d) => [d.dateType, d.dateValue])
    );

    const effectiveDate =
      dateMap.get("effective") ||
      tryParse(verified?.effectiveDateText) ||
      null;
    const expirationDate =
      dateMap.get("expiration") ||
      tryParse(verified?.expirationDateText) ||
      null;
    const renewalDate = dateMap.get("renewal") || null;
    const noticeDeadline = dateMap.get("notice_deadline") || null;

    const parties = (verified?.parties || []).map((p: any) => ({
      name: p.name,
      role: p.role,
    }));
    const territories = (verified?.territories || []).map((t: any) => ({
      name: t.name || t.value || t.territory || String(t),
    }));

    const health = computeContractHealth({
      hasVerifiedContract: !!verified,
      lifecycleStatus: lifecycle?.status,
      expirationDate,
      renewalDate,
      relationshipActive: true,
      amendmentPending: amendmentCount > 0 && lifecycle?.status === "active",
    });

    // Prefer legacy contract title if present (display only)
    let contractTitle = verified?.title || null;
    try {
      const legacy = await prisma.contracts.findFirst({
        where: { id: params.contractId },
        select: { title: true },
      });
      if (legacy?.title) contractTitle = legacy.title;
    } catch {
      /* non-blocking */
    }

    const data = {
      organizationId: params.organizationId,
      releaseId: params.releaseId,
      contractId: params.contractId,
      relationshipId: params.relationshipId ?? null,
      relationshipType: params.relationshipType ?? null,
      contractTitle,
      verifiedContractId: verified?.id ?? null,
      verifiedVersion: verified?.version ?? null,
      verificationStatus: verified?.status ?? null,
      lifecycleStatus: lifecycle?.status ?? null,
      contractStatus: lifecycle?.status ?? verified?.status ?? null,
      effectiveDate,
      expirationDate,
      renewalDate,
      noticeDeadline,
      lastVerifiedAt: verified?.promotedAt
        ? new Date(verified.promotedAt)
        : null,
      partiesJson: parties as object,
      territoriesJson: territories as object,
      rightsSummary: verified?.rightsSummary ?? null,
      relationshipCount,
      amendmentCount,
      healthStatus: health.status,
      healthReasons: health.reasons as object,
      sourceEventId: params.sourceEventId ?? null,
      projectedAt: new Date(),
    };

    const row = await prisma.releaseContractSummary.upsert({
      where: {
        releaseId_contractId: {
          releaseId: params.releaseId,
          contractId: params.contractId,
        },
      },
      create: data,
      update: data,
    });

    return row;
  }

  async appendTimeline(params: {
    organizationId: string;
    releaseId: number;
    contractId?: number | null;
    entryType: string;
    title: string;
    description?: string;
    sourceEventId?: string | null;
    sourceEventName?: string | null;
    payload?: Record<string, unknown>;
    occurredAt?: Date;
  }) {
    // Idempotent on sourceEventId + releaseId when present
    if (params.sourceEventId) {
      const existing = await prisma.releaseContractTimelineEntry.findFirst({
        where: {
          releaseId: params.releaseId,
          sourceEventId: params.sourceEventId,
        },
      });
      if (existing) return existing;
    }

    try {
      return await prisma.releaseContractTimelineEntry.create({
        data: {
          organizationId: params.organizationId,
          releaseId: params.releaseId,
          contractId: params.contractId ?? null,
          entryType: params.entryType || TIMELINE_ENTRY_TYPES.system,
          title: params.title.slice(0, 255),
          description: params.description ?? null,
          sourceEventId: params.sourceEventId ?? null,
          sourceEventName: params.sourceEventName ?? null,
          payload: (params.payload ?? {}) as object,
          occurredAt: params.occurredAt ?? new Date(),
        },
      });
    } catch (error) {
      logger.error("release-workspace.timeline", "append failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Full rebuild via platform ProjectionEngine (preferred path).
   * Falls back to local rebuild if projections are not bootstrapped.
   */
  async rebuildAll(params: { organizationId: string; limit?: number }) {
    try {
      const { projectionEngine } = await import("@/lib/platform/projections");
      const { RELEASE_CONTRACT_PROJECTION_NAME } = await import("./projection");
      const result = await projectionEngine.rebuild({
        projectionName: RELEASE_CONTRACT_PROJECTION_NAME,
        organizationId: params.organizationId,
      });
      return {
        rebuilt: result.keysProcessed,
        releaseIds: [] as number[],
        errors: result.errors,
        via: "platform.projections" as const,
      };
    } catch {
      /* fall through */
    }

    const links = await prisma.contractRelationship.findMany({
      where: {
        organizationId: params.organizationId,
        targetEntityType: "release",
        status: "active",
      },
      take: params.limit ?? 500,
    });
    const releaseIds = [
      ...new Set(
        links
          .map((r) => parseInt(r.targetEntityId, 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      ),
    ];
    let rebuilt = 0;
    for (const releaseId of releaseIds) {
      await this.rebuildForRelease({
        organizationId: params.organizationId,
        releaseId,
      });
      rebuilt += 1;
    }
    return {
      rebuilt,
      releaseIds,
      errors: [] as string[],
      via: "legacy" as const,
    };
  }
}

function tryParse(text?: string | null): Date | null {
  if (!text) return null;
  const t = Date.parse(text);
  return Number.isNaN(t) ? null : new Date(t);
}

export const releaseContractSyncService = new ReleaseContractSyncService();
