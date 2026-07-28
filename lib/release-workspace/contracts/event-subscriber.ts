/**
 * Release Workspace platform event subscriber.
 * Updates read models only — never mutates Contract Center data.
 */

import { registerSubscriber } from "@/lib/platform/events/subscribers/registry";
import { logger } from "@/lib/logger";
import { releaseContractSyncService } from "./sync-service";
import { TIMELINE_ENTRY_TYPES } from "./constants";

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

export function registerReleaseContractSubscriber(): void {
  registerSubscriber({
    id: "release-workspace.contract_projection",
    description:
      "Project contract platform events into Release Workspace read models",
    events: [
      "contracts.lifecycle.*",
      "contracts.relationship.*",
      "contracts.verified.*",
      "contracts.verification.*",
      "contracts.document.*",
    ],
    maxRetries: 5,
    handler: async ({ event }) => {
      const contractId = Number(
        event.payload.contractId ??
          (event.entityType === "contract" ? event.entityId : null)
      );

      if (!Number.isFinite(contractId) || contractId <= 0) {
        // Relationship events might target release without contractId on envelope
        const releaseId = Number(event.payload.releaseId);
        if (Number.isFinite(releaseId) && releaseId > 0) {
          await releaseContractSyncService.rebuildForRelease({
            organizationId: event.organizationId,
            releaseId,
            sourceEventId: event.id,
          });
        }
        return;
      }

      const meta = mapEventToTimeline(event.eventName);

      try {
        await releaseContractSyncService.rebuildForContract({
          organizationId: event.organizationId,
          contractId,
          sourceEventId: event.id,
          timeline: {
            entryType: meta.entryType,
            title: meta.title,
            description:
              typeof event.payload.to === "string"
                ? `Status → ${event.payload.to}`
                : undefined,
            eventName: event.eventName,
            payload: event.payload,
            occurredAt: event.occurredAt,
          },
        });
      } catch (error) {
        logger.error("release-workspace.subscriber", "projection failed", {
          eventId: event.id,
          eventName: event.eventName,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  });
}
