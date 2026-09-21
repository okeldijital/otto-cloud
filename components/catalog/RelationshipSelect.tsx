"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";

type RelationshipItem = { id: number; name: string; [key: string]: any };

type Props = {
  label: string;
  placeholder: string;
  items: RelationshipItem[];
  value: string;
  onChange: (value: string) => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  disabled?: boolean;
};

export default function RelationshipSelect({
  label, placeholder, items, value, onChange, onAddNew, addNewLabel = "Add new", disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = items.find((item) => String(item.id) === String(value));

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items.slice(0, 30);
    return items.filter((item) => (String(item.name ?? "") + " " + item.id).toLowerCase().includes(term)).slice(0, 30);
  }, [items, query]);

  const clear = () => { onChange(""); setQuery(""); };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-text-secondary">{label}</label>
      <button type="button" disabled={disabled} onClick={() => { setOpen((current) => !current); setQuery(""); }}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-elevated px-3 text-left text-sm text-text-primary transition-colors hover:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60">
        <span className={selected ? "truncate" : "truncate text-text-secondary"}>{selected?.name || placeholder}</span>
        <span className="flex shrink-0 items-center gap-1 text-text-secondary">
          {selected && <span role="button" tabIndex={0} aria-label={"Clear " + label}
            onClick={(event) => { event.stopPropagation(); clear(); }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); clear(); } }}
            className="rounded p-0.5 hover:bg-surface hover:text-text-primary"><X size={14} /></span>}
          <ChevronDown size={15} />
        </span>
      </button>

      {open && <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[var(--z-dropdown)] overflow-hidden rounded-md border border-border bg-surface shadow-lg">
        <div className="border-b border-border p-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface-elevated px-2">
            <Search size={14} className="shrink-0 text-text-secondary" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder={"Search " + label.toLowerCase() + "..."} className="!min-h-9 !border-0 !bg-transparent !px-1 !shadow-none focus:!ring-0" />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto">
          {filtered.map((item) => {
            const active = String(item.id) === String(value);
            return <button key={item.id} type="button" onClick={() => { onChange(String(item.id)); setOpen(false); setQuery(""); }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-elevated">
              <span className="min-w-0"><span className="block truncate text-text-primary">{item.name}</span><span className="block text-xs text-text-secondary">ID {item.id}</span></span>
              {active && <Check size={15} className="shrink-0 text-accent" />}
            </button>;
          })}
          {!filtered.length && <div className="px-3 py-4 text-sm text-text-secondary">No matches found.</div>}
        </div>
        {onAddNew && <div className="border-t border-border">
          <button type="button" onClick={() => { setOpen(false); setQuery(""); onAddNew(); }}
            className="flex w-full items-center gap-2 px-3 py-3 text-sm font-medium text-accent transition-colors hover:bg-surface-elevated">
            <Plus size={16} />{addNewLabel}
          </button>
        </div>}
      </div>}
    </div>
  );
}
