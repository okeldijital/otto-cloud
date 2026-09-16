import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { publishPlatformEvent } from "@/lib/platform/publish";

export const VERIFIED_CONTRACT_EVENTS = {
  Created: "VerifiedContractCreated",
  Updated: "VerifiedContractUpdated",
  Reverified: "VerifiedContractReverified",
  PartyAdded: "VerifiedPartyAdded",
  PartyUpdated: "VerifiedPartyUpdated",
} as const;

export type VerifiedContractEventType =
  (typeof VERIFIED_CONTRACT_EVENTS)[keyof typeof VERIFIED_CONTRACT_EVENTS];

/**
 * Legacy/domain event names that do not yet have a registered platform event
 * contract. They remain persisted and audited, but must not be sent through
 * the strict platform event bus until their contracts are registered.
 */
const PLATFORM_UNREGISTERED_EVENTS = new Set<VerifiedContractEventType>([
  VERIFIED_CONTRACT_EVENTS.PartyAdded,
  VERIFIED_CONTRACT_EVENTS.PartyUpdated,
]);

/**
 * Publish domain event + platform event bus (M4.2).
 */
export async function publishVerifiedContractEvent(params: {
  organizationId: string;
  contractId: number;
  verifiedContractId: string;
  eventType: VerifiedContractEventType;
  payload: Record<string, unknown>;
  userId?: number;
}): Promise<void> {
  try {
    await prisma.verifiedContractEvent.create({
      data: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        verifiedContractId: params.verifiedContractId,
        eventType: params.eventType,
        payload: params.payload as object,
      },
    });

    if (params.userId != null) {
      await recordAudit({
        action: params.eventType,
        entity_type: "verified_contract",
        entity_id: params.contractId,
        entity_name: params.verifiedContractId,
        changes: params.payload,
        user_id: params.userId,
        organization_id: params.organizationId,
      });
    }

    logger.info("verified-contract.event", params.eventType, {
      contractId: params.contractId,
      verifiedContractId: params.verifiedContractId,
    });

    if (PLATFORM_UNREGISTERED_EVENTS.has(params.eventType)) {
      logger.info("verified-contract.event", "Platform event contract not registered; domain event retained only", {
        eventType: params.eventType,
        contractId: params.contractId,
        verifiedContractId: params.verifiedContractId,
      });
      return;
    }

    const platformEventMap: Record<string, string> = {
      [VERIFIED_CONTRACT_EVENTS.Created]: "contracts.verified.created",
      [VERIFIED_CONTRACT_EVENTS.Updated]: "contracts.verified.updated",
      [VERIFIED_CONTRACT_EVENTS.Reverified]: "contracts.verified.reverified",
    };
    const eventName = platformEventMap[params.eventType];
    if (!eventName) {
      logger.warn("verified-contract.event", "No registered platform event mapping; domain event retained only", {
        eventType: params.eventType,
      });
      return;
    }

    await publishPlatformEvent({
      eventName,
      organizationId: params.organizationId,
      producer: "contract-center",
      actorUserId: params.userId,
      entityType: "contract",
      entityId: params.contractId,
      payload: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        verifiedContractId: params.verifiedContractId,
        legacyEventType: params.eventType,
        ...params.payload,
      },
    });
  } catch (error) {
    logger.error("verified-contract.event", "Failed to publish event", {
      eventType: params.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
