"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  pageNumber: number;
  numPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export default function PDFNavigation({
  pageNumber,
  numPages,
  onPageChange,
  disabled,
}: Props) {
  const [draft, setDraft] = useState(String(pageNumber));

  useEffect(() => {
    setDraft(String(pageNumber));
  }, [pageNumber]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n)) {
      setDraft(String(pageNumber));
      return;
    }
    const clamped = Math.min(numPages || 1, Math.max(1, n));
    onPageChange(clamped);
    setDraft(String(clamped));
  };

  return (
    <div
      className="flex items-center gap-1"
      role="navigation"
      aria-label="Page navigation"
    >
      <button
        type="button"
        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40"
        onClick={() => onPageChange(Math.max(1, pageNumber - 1))}
        disabled={disabled || pageNumber <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      <label className="flex items-center gap-1 text-xs text-text-secondary">
        <span className="sr-only">Current page</span>
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          disabled={disabled || numPages < 1}
          className="w-10 text-center rounded bg-white/5 border border-white/10 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Jump to page"
        />
        <span aria-live="polite">
          / {numPages || "—"}
        </span>
      </label>
      <button
        type="button"
        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40"
        onClick={() => onPageChange(Math.min(numPages, pageNumber + 1))}
        disabled={disabled || pageNumber >= numPages}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
