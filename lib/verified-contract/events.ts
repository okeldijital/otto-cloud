import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";

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
 * Publish a platform domain event (persisted log; future bus can fan-out).
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
  } catch (error) {
    logger.error("verified-contract.event", "Failed to publish event", {
      eventType: params.eventType,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
