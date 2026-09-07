import { prisma } from "@/lib/prisma";
import {
  LIFECYCLE_EVENTS,
  LIFECYCLE_STATUS,
  LIFECYCLE_STATUS_LABELS,
  type LifecycleStatus,
} from "./constants";
import { appendTimeline, publishLifecycleEvent } from "./events";

/**
 * Reconcile the operational lifecycle after a verified-contract promotion.
 *
 * Verification is the authoritative transition into the Verified lifecycle
 * state. This helper is deliberately idempotent: it may be called for every
 * successful promotion, including re-verification of an already-active
 * contract.
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

  if (!current) {
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

    await seedVerifiedKeyDates(params);

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

  if (current.organizationId !== params.organizationId) {
    throw new Error("Contract lifecycle organization mismatch");
  }

  const from = current.status as LifecycleStatus;
  const shouldTransition =
    from === LIFECYCLE_STATUS.draft ||
    from === LIFECYCLE_STATUS.pending_verification;

  const lifecycle = await prisma.contractLifecycle.update({
    where: { id: current.id },
    data: {
      verifiedContractId: params.verifiedContractId,
      ...(shouldTransition
        ? {
            previousStatus: from,
            status: LIFECYCLE_STATUS.verified,
            statusChangedAt: new Date(),
            statusChangedBy: params.userId,
          }
        : {}),
    },
  });

  if (shouldTransition) {
    await seedVerifiedKeyDates(params, lifecycle.id);

    await appendTimeline({
      organizationId: params.organizationId,
      contractId: params.contractId,
      entryType: "status_change",
      title: `Status → ${LIFECYCLE_STATUS_LABELS.verified}`,
      description: `From ${from}`,
      actorUserId: params.userId,
      payload: {
        from,
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
        from,
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
        status: from,
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
  lifecycleId?: string
) {
  const id = lifecycleId ?? (
    await prisma.contractLifecycle.findUniqueOrThrow({
      where: { contractId: params.contractId },
      select: { id: true },
    })
  ).id;

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
      where: {
        lifecycleId_dateType: { lifecycleId: id, dateType },
      },
      create: {
        lifecycleId: id,
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
