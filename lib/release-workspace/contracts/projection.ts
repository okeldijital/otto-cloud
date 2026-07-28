/**
 * Release Workspace — reference ProjectionDefinition.
 *
 * Domain-only: resolveKeys + project (builder).
 * Platform owns subscription, replay, rebuild orchestration, checkpoints, metrics.
 */

import { prisma } from "@/lib/prisma";
import {
  registerProjection,
  type ProjectionContext,
  type ProjectionDefinition,
  type ProjectionKey,
} from "@/lib/platform/projections";
import type { PlatformEventRecord } from "@/lib/platform/events/types";
import { releaseContractSyncService } from "./sync-service";
import { TIMELINE_ENTRY_TYPES } from "./constants";

export const RELEASE_CONTRACT_PROJECTION_NAME = "release.contract.summary";

export function releaseKey(releaseId: number): ProjectionKey {
  return {
    key: `release:${releaseId}`,
    parts: { releaseId },
  };
}

export function parseReleaseKey(key: ProjectionKey): number | null {
  const fromParts = key.parts?.releaseId;
  if (fromParts != null) {
    const n = Number(fromParts);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const m = /^release:(\d+)/.exec(key.key);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mapEventToTimeline(eventName: string): {
  entryType: string;
  title: string;
} {
  if (eventName.startsWith("contracts.lifecycle.")) {
    return {
      entryType: TIMELINE_ENTRY_TYPES.lifecycle,
      title: `Lifecycle: ${eventName.replace("contracts.lifecycle.", "")}`,
    };
  }
  if (eventName.startsWith("contracts.relationship.")) {
    return {
      entryType: TIMELINE_ENTRY_TYPES.relationship,
      title: `Relationship: ${eventName.replace("contracts.relationship.", "")}`,
    };
  }
  if (eventName.startsWith("contracts.verified.")) {
    return {
      entryType: TIMELINE_ENTRY_TYPES.verification,
      title: `Verified: ${eventName.replace("contracts.verified.", "")}`,
    };
  }
  if (eventName.startsWith("contracts.verification.")) {
    return {
      entryType: TIMELINE_ENTRY_TYPES.verification,
      title: `Verification: ${eventName.replace("contracts.verification.", "")}`,
    };
  }
  if (eventName.startsWith("contracts.document.")) {
    return {
      entryType: TIMELINE_ENTRY_TYPES.document,
      title: `Document: ${eventName.replace("contracts.document.", "")}`,
    };
  }
  if (eventName.includes("amended") || eventName.includes("amendment")) {
    return {
      entryType: TIMELINE_ENTRY_TYPES.amendment,
      title: "Contract amended",
    };
  }
  return {
    entryType: TIMELINE_ENTRY_TYPES.system,
    title: eventName,
  };
}

async function resolveReleaseIdsForContract(
  organizationId: string,
  contractId: number
): Promise<number[]> {
  const relationships = await prisma.contractRelationship.findMany({
    where: {
      organizationId,
      contractId,
      targetEntityType: "release",
      status: "active",
    },
  });

  const fromRels = relationships
    .map((r) => parseInt(r.targetEntityId, 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  // Also include releases that still have a stale projection for this contract
  // (relationship removed) so projections are cleaned.
  const stale = await prisma.releaseContractSummary.findMany({
    where: { organizationId, contractId },
    select: { releaseId: true },
  });

  return [
    ...new Set([
      ...fromRels,
      ...stale.map((s) => s.releaseId),
    ]),
  ];
}

export const releaseContractProjectionDefinition: ProjectionDefinition = {
  name: RELEASE_CONTRACT_PROJECTION_NAME,
  version: "1.0.0",
  owner: "release-workspace",
  description:
    "Release↔contract summary projection (reference implementation of platform projections)",
  events: [
    "contracts.lifecycle.*",
    "contracts.relationship.*",
    "contracts.verified.*",
    "contracts.verification.*",
    "contracts.document.*",
  ],
  maxRetries: 5,

  async resolveKeys(event: PlatformEventRecord): Promise<ProjectionKey[]> {
    const contractId = Number(
      event.payload.contractId ??
        (event.entityType === "contract" ? event.entityId : null)
    );

    if (Number.isFinite(contractId) && contractId > 0) {
      const releaseIds = await resolveReleaseIdsForContract(
        event.organizationId,
        contractId
      );
      return releaseIds.map(releaseKey);
    }

    const releaseId = Number(event.payload.releaseId);
    if (Number.isFinite(releaseId) && releaseId > 0) {
      return [releaseKey(releaseId)];
    }

    return [];
  },

  async project(key: ProjectionKey, ctx: ProjectionContext): Promise<void> {
    const releaseId = parseReleaseKey(key);
    if (!releaseId) return;

    await releaseContractSyncService.rebuildForRelease({
      organizationId: ctx.organizationId,
      releaseId,
      sourceEventId: ctx.sourceEventId,
    });

    // Timeline entry from platform event (idempotent on sourceEventId)
    if (ctx.sourceEventId && ctx.sourceEventName) {
      const meta = mapEventToTimeline(ctx.sourceEventName);
      const contractId = Number(ctx.payload?.contractId);
      await releaseContractSyncService.appendTimeline({
        organizationId: ctx.organizationId,
        releaseId,
        contractId:
          Number.isFinite(contractId) && contractId > 0 ? contractId : null,
        entryType: meta.entryType,
        title: meta.title,
        description:
          typeof ctx.payload?.to === "string"
            ? `Status → ${ctx.payload.to}`
            : undefined,
        sourceEventId: ctx.sourceEventId,
        sourceEventName: ctx.sourceEventName,
        payload: ctx.payload,
        occurredAt: ctx.occurredAt,
      });
    }
  },

  async listKeys(organizationId: string): Promise<ProjectionKey[]> {
    const links = await prisma.contractRelationship.findMany({
      where: {
        organizationId,
        targetEntityType: "release",
        status: "active",
      },
      take: 2000,
    });
    const releaseIds = [
      ...new Set(
        links
          .map((r) => parseInt(r.targetEntityId, 10))
          .filter((n) => Number.isFinite(n) && n > 0)
      ),
    ];
    return releaseIds.map(releaseKey);
  },
};

export function registerReleaseContractProjection(): void {
  registerProjection(releaseContractProjectionDefinition);
}
