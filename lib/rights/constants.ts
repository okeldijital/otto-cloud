/** Data-driven rights categories */
export const RIGHT_CATEGORIES = [
  "master_recording",
  "composition",
  "mechanical",
  "performance",
  "synchronization",
  "neighboring",
  "distribution",
  "digital_distribution",
  "streaming",
  "broadcast",
  "territory",
  "licensing",
  "publishing",
  "administration",
  "custom",
] as const;

export type RightCategory = (typeof RIGHT_CATEGORIES)[number];

export const RIGHT_CATEGORY_LABELS: Record<string, string> = {
  master_recording: "Master Recording Rights",
  composition: "Composition Rights",
  mechanical: "Mechanical Rights",
  performance: "Performance Rights",
  synchronization: "Synchronization Rights",
  neighboring: "Neighboring Rights",
  distribution: "Distribution Rights",
  digital_distribution: "Digital Distribution Rights",
  streaming: "Streaming Rights",
  broadcast: "Broadcast Rights",
  territory: "Territory Rights",
  licensing: "Licensing Rights",
  publishing: "Publishing Rights",
  administration: "Administration Rights",
  custom: "Custom Rights",
};

export const RIGHT_STATUS = {
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

export type RightStatus = (typeof RIGHT_STATUS)[keyof typeof RIGHT_STATUS];

export const RIGHT_TRANSITIONS: Record<RightStatus, RightStatus[]> = {
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

export function canTransitionRight(from: RightStatus, to: RightStatus): boolean {
  if (from === to) return true;
  return (RIGHT_TRANSITIONS[from] || []).includes(to);
}

export const RIGHT_EVENTS = {
  CandidateCreated: "rights.candidate.created",
  ReviewCompleted: "rights.review.completed",
  Created: "rights.created",
  Updated: "rights.updated",
  Activated: "rights.activated",
  Expired: "rights.expired",
  Assigned: "rights.assigned",
  Transferred: "rights.transferred",
  Restricted: "rights.restricted",
  Superseded: "rights.superseded",
  Terminated: "rights.terminated",
} as const;

export const OWNER_TYPES = [
  "organization",
  "label",
  "publisher",
  "artist",
  "individual",
  "estate",
  "custom",
] as const;

export const RESTRICTION_TYPES = [
  "territory",
  "platform",
  "media",
  "language",
  "time",
  "usage",
  "distribution",
  "exclusivity",
  "carve_out",
  "suspension",
  "custom",
] as const;
