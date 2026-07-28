/**
 * ReleaseTimelineService — unified release + contract operational timeline.
 * Contract events remain identifiable via entryType / contractId.
 */

import { prisma } from "@/lib/prisma";
import { releaseContractSyncService } from "./sync-service";

export class ReleaseTimelineService {
  async getTimeline(params: {
    organizationId: string;
    releaseId: number;
    limit?: number;
  }) {
    const take = Math.min(params.limit ?? 100, 200);

    // Ensure projections exist so relationship context is current
    const links = await prisma.releaseContractSummary.findMany({
      where: {
        organizationId: params.organizationId,
        releaseId: params.releaseId,
      },
      select: { contractId: true },
    });

    if (links.length === 0) {
      await releaseContractSyncService.rebuildForRelease({
        organizationId: params.organizationId,
        releaseId: params.releaseId,
      });
    }

    const projected = await prisma.releaseContractTimelineEntry.findMany({
      where: {
        organizationId: params.organizationId,
        releaseId: params.releaseId,
      },
      orderBy: { occurredAt: "desc" },
      take,
    });

    // Merge live contract timeline entries for linked contracts
    const contractIds = (
      await prisma.releaseContractSummary.findMany({
        where: {
          organizationId: params.organizationId,
          releaseId: params.releaseId,
        },
        select: { contractId: true },
      })
    ).map((r) => r.contractId);

    let contractEntries: any[] = [];
    if (contractIds.length > 0) {
      contractEntries = await prisma.contractTimelineEntry.findMany({
        where: {
          organizationId: params.organizationId,
          contractId: { in: contractIds },
        },
        orderBy: { occurredAt: "desc" },
        take,
      });
    }

    const merged = [
      ...projected.map((e) => ({
        id: e.id,
        source: "release_projection" as const,
        entryType: e.entryType,
        title: e.title,
        description: e.description,
        contractId: e.contractId,
        sourceEventId: e.sourceEventId,
        sourceEventName: e.sourceEventName,
        payload: e.payload,
        occurredAt: e.occurredAt.toISOString(),
        isContractEvent: e.entryType !== "release" && e.entryType !== "system",
      })),
      ...contractEntries.map((e) => ({
        id: `ct-${e.id}`,
        source: "contract_timeline" as const,
        entryType: e.entryType,
        title: e.title,
        description: e.description,
        contractId: e.contractId,
        sourceEventId: null as string | null,
        sourceEventName: null as string | null,
        payload: e.payload,
        occurredAt: e.occurredAt.toISOString(),
        isContractEvent: true,
      })),
    ];

    merged.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );

    return merged.slice(0, take);
  }
}

export const releaseTimelineService = new ReleaseTimelineService();
