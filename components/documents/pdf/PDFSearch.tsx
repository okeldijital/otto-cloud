"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClear: () => void;
  matchCount: number;
  activeIndex: number;
  busy?: boolean;
  collapsed?: boolean;
}

export default function PDFSearch({
  query,
  onQueryChange,
  onSearch,
  onNext,
  onPrev,
  onClear,
  matchCount,
  activeIndex,
  busy,
}: Props) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="search"
      aria-label="Search within PDF"
    >
      <div className="relative flex items-center">
        <Search
          size={14}
          className="absolute left-2 text-text-secondary pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (e.shiftKey) onPrev();
              else if (matchCount > 0) onNext();
              else onSearch();
            }
          }}
          placeholder="Search…"
          className="w-28 sm:w-40 pl-7 pr-7 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Search text in document"
          disabled={busy}
        />
        {query && (
          <button
            type="button"
            className="absolute right-1.5 p-0.5 text-text-secondary hover:text-white"
            onClick={onClear}
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <button
        type="button"
        className="px-2 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40"
        onClick={onSearch}
        disabled={busy || !query.trim()}
      >
        Find
      </button>
      <span className="text-xs text-text-secondary tabular-nums min-w-[4.5rem]" aria-live="polite">
        {matchCount > 0
          ? `${activeIndex + 1} / ${matchCount}`
          : query.trim()
            ? "0 results"
            : ""}
      </span>
      <button
        type="button"
        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40"
        onClick={onPrev}
        disabled={matchCount === 0}
        aria-label="Previous search result"
      >
        <ChevronUp size={16} />
      </button>
      <button
        type="button"
        className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40"
        onClick={onNext}
        disabled={matchCount === 0}
        aria-label="Next search result"
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}
