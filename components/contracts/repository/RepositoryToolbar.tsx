"use client";

import { RefreshCw, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import { SORT_LABELS, type SortOption } from "./types";

interface Props {
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
  onUpload: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  total: number;
  visible: number;
}

export default function RepositoryToolbar({
  sort,
  onSortChange,
  onUpload,
  onRefresh,
  refreshing,
  total,
  visible,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="text-sm text-text-secondary" aria-live="polite">
        Showing <span className="text-white font-medium">{visible}</span> of{" "}
        <span className="text-white font-medium">{total}</span> documents
        {refreshing && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs">
            <RefreshCw size={12} className="animate-spin" aria-hidden /> Refreshing
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          Sort
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Sort documents"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} aria-hidden />
          Refresh
        </Button>
        <Button variant="primary" size="sm" onClick={onUpload}>
          <Upload size={14} aria-hidden /> Upload
        </Button>
      </div>
    </div>
  );
}
