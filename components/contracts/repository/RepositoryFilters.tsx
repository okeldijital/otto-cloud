"use client";

import type { RepositoryFilters as Filters } from "./types";

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  onReset: () => void;
}

export default function RepositoryFilters({ filters, onChange, onReset }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3"
      role="search"
      aria-label="Filter documents"
    >
      <label className="block text-xs text-text-secondary">
        Filename
        <input
          type="search"
          value={filters.filename}
          onChange={(e) => set("filename", e.target.value)}
          placeholder="Search name…"
          className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="block text-xs text-text-secondary">
        Type
        <input
          type="text"
          value={filters.type}
          onChange={(e) => set("type", e.target.value)}
          placeholder="PDF"
          className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="block text-xs text-text-secondary">
        Status
        <select
          value={filters.status}
          onChange={(e) => set("status", e.target.value as Filters["status"])}
          className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="deleted">Deleted</option>
        </select>
      </label>
      <label className="block text-xs text-text-secondary">
        Uploaded from
        <input
          type="date"
          value={filters.uploadedFrom}
          onChange={(e) => set("uploadedFrom", e.target.value)}
          className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="block text-xs text-text-secondary">
        Uploaded to
        <input
          type="date"
          value={filters.uploadedTo}
          onChange={(e) => set("uploadedTo", e.target.value)}
          className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </label>
      <label className="block text-xs text-text-secondary">
        Uploaded by
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={filters.uploadedBy}
            onChange={(e) => set("uploadedBy", e.target.value)}
            placeholder="Name or id"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={onReset}
            className="shrink-0 text-xs text-text-secondary hover:text-white underline px-1"
          >
            Reset
          </button>
        </div>
      </label>
    </div>
  );
}
