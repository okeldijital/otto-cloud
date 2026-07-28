export const HEALTH_STATUS = {
  healthy: "healthy",
  warning: "warning",
  critical: "critical",
} as const;

export type HealthStatus =
  (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
};

/** Days until expiration/renewal that trigger warning. */
export const EXPIRING_SOON_DAYS = 90;

export const RELEASE_CONTRACT_EVENTS = {
  SummaryUpdated: "release.contract.summary.updated",
  HealthChanged: "release.health.changed",
} as const;

export const TIMELINE_ENTRY_TYPES = {
  release: "release",
  lifecycle: "lifecycle",
  relationship: "relationship",
  verification: "verification",
  document: "document",
  amendment: "amendment",
  system: "system",
} as const;
