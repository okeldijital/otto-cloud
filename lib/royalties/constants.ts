export const REVENUE_CATEGORIES = [
  "master",
  "publishing",
  "mechanical",
  "performance",
  "neighboring",
  "sync",
  "distribution",
  "administration",
  "streaming",
  "custom",
] as const;

export const REVENUE_CATEGORY_LABELS: Record<string, string> = {
  master: "Master share",
  publishing: "Publishing share",
  mechanical: "Mechanical",
  performance: "Performance",
  neighboring: "Neighboring",
  sync: "Synchronization",
  distribution: "Distribution",
  administration: "Administration",
  streaming: "Streaming",
  custom: "Custom",
};

export const ALLOCATION_TYPES = [
  "percentage",
  "fixed",
  "priority",
  "residual",
  "pass_through",
  "holdback",
  "reserved",
  "custom",
] as const;

export const SPLIT_TYPES = [
  "equal",
  "fractional",
  "weighted",
  "priority",
  "residual",
  "nested",
  "custom",
] as const;

export const BENEFICIARY_TYPES = [
  "organization",
  "label",
  "publisher",
  "artist",
  "individual",
  "collection_society",
  "estate",
  "custom",
] as const;

export const ENTITLEMENT_STATUS = {
  candidate: "candidate",
  pending_review: "pending_review",
  approved: "approved",
  active: "active",
  suspended: "suspended",
  expired: "expired",
  superseded: "superseded",
  terminated: "terminated",
  archived: "archived",
} as const;

export type EntitlementStatus =
  (typeof ENTITLEMENT_STATUS)[keyof typeof ENTITLEMENT_STATUS];

export const ENTITLEMENT_TRANSITIONS: Record<
  EntitlementStatus,
  EntitlementStatus[]
> = {
  candidate: ["pending_review", "archived"],
  pending_review: ["approved", "candidate", "archived"],
  approved: ["active", "suspended", "archived"],
  active: ["suspended", "expired", "superseded", "terminated", "archived"],
  suspended: ["active", "terminated", "archived"],
  expired: ["archived", "active"],
  superseded: ["archived"],
  terminated: ["archived"],
  archived: [],
};

export function canTransitionEntitlement(
  from: EntitlementStatus,
  to: EntitlementStatus
): boolean {
  if (from === to) return true;
  return (ENTITLEMENT_TRANSITIONS[from] || []).includes(to);
}

export const ENTITLEMENT_EVENTS = {
  CandidateCreated: "royalties.entitlement.candidate.created",
  ReviewCompleted: "royalties.entitlement.review.completed",
  Created: "royalties.entitlement.created",
  Updated: "royalties.entitlement.updated",
  Activated: "royalties.entitlement.activated",
  Expired: "royalties.entitlement.expired",
  Transferred: "royalties.entitlement.transferred",
  Suspended: "royalties.entitlement.suspended",
  Terminated: "royalties.entitlement.terminated",
} as const;

/** Map right category → default revenue category for promotion */
export function mapRightCategoryToRevenue(category: string): string {
  const map: Record<string, string> = {
    master_recording: "master",
    composition: "publishing",
    mechanical: "mechanical",
    performance: "performance",
    synchronization: "sync",
    neighboring: "neighboring",
    distribution: "distribution",
    digital_distribution: "distribution",
    streaming: "streaming",
    publishing: "publishing",
    administration: "administration",
    broadcast: "performance",
    licensing: "custom",
    territory: "custom",
    custom: "custom",
  };
  return map[category] || "custom";
}

/**
 * Validate fractional split sums to ~100 (tolerance 0.01).
 */
export function validateFractionalSplit(
  shares: Array<{ sharePercent?: number | null }>
): { ok: boolean; total: number; error?: string } {
  const total = shares.reduce((s, x) => s + (Number(x.sharePercent) || 0), 0);
  if (shares.length === 0) {
    return { ok: false, total, error: "At least one share is required" };
  }
  if (Math.abs(total - 100) > 0.01 && Math.abs(total - 1) > 0.0001) {
    // allow 0-1 fraction form or 0-100 percent form
    return {
      ok: false,
      total,
      error: `Fractional shares must total 100% (got ${total})`,
    };
  }
  return { ok: true, total };
}
