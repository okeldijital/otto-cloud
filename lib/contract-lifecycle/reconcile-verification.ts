import { prisma } from "@/lib/prisma";
import {
  LIFECYCLE_EVENTS,
  LIFECYCLE_STATUS,
  LIFECYCLE_STATUS_LABELS,
  type LifecycleStatus,
} from "./constants";
import { decideVerificationReconciliation } from "./reconcile-verification-policy";
import { appendTimeline, publishLifecycleEvent } from "./events";

/**
 * Reconcile the operational lifecycle after a verified-contract promotion.
 * Verification is authoritative for entry into Verified. The operation is
 * idempotent and preserves already-advanced lifecycle states.
 */
export async function reconcileLifecycleAfterVerification(params: {
  organizationId: string;
  contractId: number;
  verifiedContractId: string;
  verifiedVersion: number;
  userId: number;
}) {
  const current = await prisma.contractLifecycle.findUnique({
    where: { contractId: params.contractId },
  });

  const decision = decideVerificationReconciliation(
    current?.status as LifecycleStatus | null
  );

  if (decision.action === "create") {
    const lifecycle = await prisma.contractLifecycle.create({
      data: {
        organizationId: params.organizationId,
        contractId: params.contractId,
        verifiedContractId: params.verifiedContractId,
        status: LIFECYCLE_STATUS.verified,
        statusChangedAt: new Date(),
        statusChangedBy: params.userId,
      },
    });

    await seedVerifiedKeyDates(params, lifecycle.id);
    await appendTimeline({
      organizationId: params.organizationId,
      contractId: params.contractId,
      entryType: "lifecycle",
      title: "Lifecycle reconciled from verification",
      description: `Status: ${LIFECYCLE_STATUS_LABELS.verified}`,
      actorUserId: params.userId,
      payload: {
        status: LIFECYCLE_STATUS.verified,
        verifiedContractId: params.verifiedContractId,
        verifiedVersion: params.verifiedVersion,
      },
    });
    await publishLifecycleEvent({
      organizationId: params.organizationId,
      contractId: params.contractId,
      eventType: LIFECYCLE_EVENTS.StatusChanged,
      payload: {
        from: null,
        to: LIFECYCLE_STATUS.verified,
        verifiedContractId: params.verifiedContractId,
        verifiedVersion: params.verifiedVersion,
      },
      userId: params.userId,
    });
    return lifecycle;
  }

  if (!current) throw new Error("Contract lifecycle reconciliation state missing");
  if (current.organizationId !== params.organizationId) {
    throw new Error("Contract lifecycle organization mismatch");
  }

  const lifecycle = await prisma.contractLifecycle.update({
    where: { id: current.id },
    data: {
      verifiedContractId: params.verifiedContractId,
      ...(decision.action === "transition"
        ? {
            previousStatus: decision.from,
            status: LIFECYCLE_STATUS.verified,
            statusChangedAt: new Date(),
            statusChangedBy: params.userId,
          }
        : {}),
    },
  });

  if (decision.action === "transition") {
    await seedVerifiedKeyDates(params, lifecycle.id);
    await appendTimeline({
      organizationId: params.organizationId,
      contractId: params.contractId,
      entryType: "status_change",
      title: `Status → ${LIFECYCLE_STATUS_LABELS.verified}`,
      description: `From ${decision.from}`,
      actorUserId: params.userId,
      payload: {
        from: decision.from,
        to: LIFECYCLE_STATUS.verified,
        verifiedContractId: params.verifiedContractId,
        verifiedVersion: params.verifiedVersion,
      },
    });
    await publishLifecycleEvent({
      organizationId: params.organizationId,
      contractId: params.contractId,
      eventType: LIFECYCLE_EVENTS.StatusChanged,
      payload: {
        from: decision.from,
        to: LIFECYCLE_STATUS.verified,
        verifiedContractId: params.verifiedContractId,
        verifiedVersion: params.verifiedVersion,
      },
      userId: params.userId,
    });
  } else {
    await appendTimeline({
      organizationId: params.organizationId,
      contractId: params.contractId,
      entryType: "verification",
      title: "Lifecycle bound to verified contract version",
      description: `Verified version ${params.verifiedVersion} is current`,
      actorUserId: params.userId,
      payload: {
        status: decision.status,
        verifiedContractId: params.verifiedContractId,
        verifiedVersion: params.verifiedVersion,
      },
    });
  }

  return lifecycle;
}

async function seedVerifiedKeyDates(
  params: {
    organizationId: string;
    contractId: number;
    verifiedContractId: string;
  },
  lifecycleId: string
) {
  const verified = await prisma.verifiedContract.findUnique({
    where: { id: params.verifiedContractId },
    select: { effectiveDateText: true, expirationDateText: true },
  });
  if (!verified) return;

  for (const [dateType, text] of [
    ["effective", verified.effectiveDateText],
    ["expiration", verified.expirationDateText],
  ] as const) {
    if (!text) continue;
    const parsed = tryParseDate(text);
    if (!parsed) continue;

    await prisma.contractKeyDate.upsert({
      where: { lifecycleId_dateType: { lifecycleId, dateType } },
      create: {
        lifecycleId,
        organizationId: params.organizationId,
        contractId: params.contractId,
        dateType,
        dateValue: parsed,
        timezone: "UTC",
        verificationState: "verified",
        source: "verified_contract",
        sourceRef: params.verifiedContractId,
        notes: `Seeded from: ${text}`,
      },
      update: {},
    });
  }
}

function tryParseDate(text: string): Date | null {
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}
