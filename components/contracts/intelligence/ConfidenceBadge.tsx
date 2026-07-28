"use client";

import Badge from "@/components/ui/Badge";
import {
  confidenceBand,
  confidenceBandVariant,
} from "@/lib/document-intelligence/verification/confidence-ui";

export default function ConfidenceBadge({
  confidence,
  size = "sm",
}: {
  confidence: number;
  size?: "sm" | "md";
}) {
  const band = confidenceBand(confidence ?? 0);
  const variant = confidenceBandVariant(band);
  const pct = Math.round((confidence ?? 0) * 100);
  return (
    <Badge variant={variant} size={size}>
      <span className="sr-only">Confidence {band}: </span>
      {pct}%
      <span
        className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
          band === "high"
            ? "bg-success"
            : band === "medium"
              ? "bg-warning"
              : "bg-danger"
        }`}
        aria-hidden
      />
    </Badge>
  );
}
