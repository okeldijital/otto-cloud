"use client";

import { Loader2 } from "lucide-react";

interface Props {
  message?: string;
  progress?: number | null;
}

export default function PDFLoading({
  message = "Loading document…",
  progress = null,
}: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-text-secondary"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 size={28} className="animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-text-primary">{message}</p>
      {progress != null && Number.isFinite(progress) && (
        <div className="w-48 max-w-full">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="text-xs mt-1 text-center">{Math.round(progress)}%</p>
        </div>
      )}
      <span className="sr-only">Document is loading</span>
    </div>
  );
}
