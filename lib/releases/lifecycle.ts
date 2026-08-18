export const RELEASE_STATUSES = ["draft", "ready", "scheduled", "released"] as const;

export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<ReleaseStatus, readonly ReleaseStatus[]> = {
  draft: ["draft", "ready"],
  ready: ["ready", "scheduled"],
  scheduled: ["scheduled", "released"],
  released: ["released"],
};

export function isReleaseStatus(value: unknown): value is ReleaseStatus {
  return typeof value === "string" && (RELEASE_STATUSES as readonly string[]).includes(value);
}

export function validateReleaseTransition(current: unknown, next: unknown): { ok: true } | { ok: false; reason: string } {
  if (!isReleaseStatus(current) || !isReleaseStatus(next)) {
    return { ok: false, reason: "Invalid release status" };
  }

  if (ALLOWED_TRANSITIONS[current].includes(next)) return { ok: true };

  return { ok: false, reason: `Invalid release status transition: ${current} → ${next}` };
}
