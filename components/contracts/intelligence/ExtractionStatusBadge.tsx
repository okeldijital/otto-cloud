"use client";

import Badge from "@/components/ui/Badge";

const LABELS: Record<string, { label: string; variant: string }> = {
  queued: { label: "Queued", variant: "neutral" },
  running: { label: "Extracting", variant: "primary" },
  retrying: { label: "Retrying", variant: "warn" },
  completed: { label: "Draft ready", variant: "success" },
  failed: { label: "Failed", variant: "critical" },
  cancelled: { label: "Cancelled", variant: "neutral" },
  awaiting_verification: { label: "Awaiting review", variant: "warn" },
  draft: { label: "Draft", variant: "neutral" },
};

interface Props {
  status: string | null | undefined;
  size?: "sm" | "md";
}

export default function ExtractionStatusBadge({ status, size = "sm" }: Props) {
  if (!status) {
    return (
      <Badge variant="ghost" size={size}>
        Not extracted
      </Badge>
    );
  }
  const meta = LABELS[status] || { label: status, variant: "neutral" };
  return (
    <Badge variant={meta.variant as any} size={size}>
      <span className="sr-only">Extraction status: </span>
      {meta.label}
      <span
        className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
          status === "completed" || status === "awaiting_verification"
            ? "bg-success"
            : status === "failed"
              ? "bg-danger"
              : status === "running" || status === "retrying"
                ? "bg-primary animate-pulse"
                : "bg-text-secondary"
        }`}
        aria-hidden
      />
    </Badge>
  );
}
