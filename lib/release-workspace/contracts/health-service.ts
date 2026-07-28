/**
 * Release contract health — pure derived computation.
 * Never stored as manual input; recomputed on every projection sync.
 */

import {
  EXPIRING_SOON_DAYS,
  HEALTH_STATUS,
  type HealthStatus,
} from "./constants";

export interface HealthInput {
  hasVerifiedContract: boolean;
  lifecycleStatus?: string | null;
  expirationDate?: Date | string | null;
  renewalDate?: Date | string | null;
  relationshipActive?: boolean;
  amendmentPending?: boolean;
  verificationReopened?: boolean;
}

export interface HealthResult {
  status: HealthStatus;
  reasons: string[];
}

function parseDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const dt = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function daysUntil(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return Math.ceil((t.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Compute health for a single linked contract projection.
 */
export function computeContractHealth(input: HealthInput): HealthResult {
  const reasons: string[] = [];
  let status: HealthStatus = HEALTH_STATUS.healthy;

  const escalate = (next: HealthStatus, reason: string) => {
    reasons.push(reason);
    if (next === HEALTH_STATUS.critical) status = HEALTH_STATUS.critical;
    else if (
      next === HEALTH_STATUS.warning &&
      status !== HEALTH_STATUS.critical
    ) {
      status = HEALTH_STATUS.warning;
    }
  };

  if (input.relationshipActive === false) {
    escalate(HEALTH_STATUS.critical, "Broken or inactive relationship");
  }

  if (!input.hasVerifiedContract) {
    escalate(HEALTH_STATUS.critical, "Missing verified contract");
  }

  const lc = (input.lifecycleStatus || "").toLowerCase();
  if (lc === "expired" || lc === "terminated") {
    escalate(HEALTH_STATUS.critical, `Lifecycle status: ${lc}`);
  }
  if (lc === "superseded") {
    escalate(HEALTH_STATUS.warning, "Contract superseded");
  }
  if (lc === "pending_renewal") {
    escalate(HEALTH_STATUS.warning, "Pending renewal");
  }
  if (lc === "pending_verification" || lc === "draft") {
    escalate(HEALTH_STATUS.warning, "Not fully verified / active");
  }

  const exp = parseDate(input.expirationDate);
  if (exp) {
    const days = daysUntil(exp);
    if (days < 0) {
      escalate(HEALTH_STATUS.critical, "Past expiration date");
    } else if (days <= EXPIRING_SOON_DAYS) {
      escalate(
        HEALTH_STATUS.warning,
        `Expires in ${days} day${days === 1 ? "" : "s"}`
      );
    }
  }

  const ren = parseDate(input.renewalDate);
  if (ren) {
    const days = daysUntil(ren);
    if (days >= 0 && days <= EXPIRING_SOON_DAYS) {
      escalate(
        HEALTH_STATUS.warning,
        `Renewal in ${days} day${days === 1 ? "" : "s"}`
      );
    }
  }

  if (input.verificationReopened) {
    escalate(HEALTH_STATUS.warning, "Verification reopened");
  }
  if (input.amendmentPending) {
    escalate(HEALTH_STATUS.warning, "Pending amendment");
  }

  if (status === HEALTH_STATUS.healthy && reasons.length === 0) {
    reasons.push("Verified, linked, and active");
  }

  return { status, reasons };
}

/**
 * Aggregate health across linked contracts for a release.
 * Worst status wins.
 */
export function aggregateReleaseHealth(
  items: HealthResult[]
): HealthResult {
  if (items.length === 0) {
    return {
      status: HEALTH_STATUS.warning,
      reasons: ["No contracts linked to this release"],
    };
  }
  let status: HealthStatus = HEALTH_STATUS.healthy;
  const reasons: string[] = [];
  for (const item of items) {
    if (item.status === HEALTH_STATUS.critical) status = HEALTH_STATUS.critical;
    else if (
      item.status === HEALTH_STATUS.warning &&
      status !== HEALTH_STATUS.critical
    ) {
      status = HEALTH_STATUS.warning;
    }
    reasons.push(...item.reasons);
  }
  return { status, reasons: [...new Set(reasons)].slice(0, 20) };
}
