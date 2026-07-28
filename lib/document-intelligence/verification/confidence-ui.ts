/**
 * Advisory confidence bands for UI (humans always decide).
 */
export type ConfidenceBand = "high" | "medium" | "low";

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.95) return "high";
  if (confidence >= 0.8) return "medium";
  return "low";
}

export function confidenceBandLabel(band: ConfidenceBand): string {
  switch (band) {
    case "high":
      return "High (95–100%)";
    case "medium":
      return "Medium (80–94%)";
    default:
      return "Low (<80%)";
  }
}

/** Tailwind-ish class hints for badges */
export function confidenceBandVariant(
  band: ConfidenceBand
): "success" | "warn" | "critical" {
  switch (band) {
    case "high":
      return "success";
    case "medium":
      return "warn";
    default:
      return "critical";
  }
}
