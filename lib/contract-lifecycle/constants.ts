export const LIFECYCLE_STATUS = {
  draft: "draft",
  pending_verification: "pending_verification",
  verified: "verified",
  active: "active",
  pending_renewal: "pending_renewal",
  expired: "expired",
  terminated: "terminated",
  superseded: "superseded",
  archived: "archived",
} as const;

export type LifecycleStatus =
  (typeof LIFECYCLE_STATUS)[keyof typeof LIFECYCLE_STATUS];

export const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  draft: "Draft",
  pending_verification: "Pending Verification",
  verified: "Verified",
  active: "Active",
  pending_renewal: "Pending Renewal",
  expired: "Expired",
  terminated: "Terminated",
  superseded: "Superseded",
  archived: "Archived",
};

/**
 * Valid state transitions (deterministic).
 * Key = from status, value = allowed next statuses.
 */
export const LIFECYCLE_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  draft: ["pending_verification", "verified", "archived"],
  pending_verification: ["verified", "draft", "archived"],
  verified: ["active", "pending_renewal", "terminated", "superseded", "archived"],
  active: ["pending_renewal", "expired", "terminated", "superseded", "archived"],
  pending_renewal: ["active", "expired", "terminated", "archived"],
  expired: ["archived", "pending_renewal", "active"],
  terminated: ["archived"],
  superseded: ["archived"],
  archived: [],
};

export const KEY_DATE_TYPES = [
  "effective",
  "execution",
  "expiration",
  "renewal",
  "notice_deadline",
  "termination",
  "review",
] as const;

export type KeyDateType = (typeof KEY_DATE_TYPES)[number];

export const KEY_DATE_LABELS: Record<string, string> = {
  effective: "Effective Date",
  execution: "Execution Date",
  expiration: "Expiration Date",
  renewal: "Renewal Date",
  notice_deadline: "Notice Deadline",
  termination: "Termination Date",
  review: "Review Date",
};

export const RENEWAL_STATUS = {
  none: "none",
  pending: "pending",
  due: "due",
  completed: "completed",
  waived: "waived",
} as const;

export const LIFECYCLE_EVENTS = {
  Activated: "ContractActivated",
  Expired: "ContractExpired",
  RenewalDue: "ContractRenewalDue",
  Renewed: "ContractRenewed",
  Superseded: "ContractSuperseded",
  Amended: "ContractAmended",
  StatusChanged: "LifecycleStatusChanged",
} as const;

export function canTransition(
  from: LifecycleStatus,
  to: LifecycleStatus
): boolean {
  if (from === to) return true;
  return (LIFECYCLE_TRANSITIONS[from] || []).includes(to);
}
