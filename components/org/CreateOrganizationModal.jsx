"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Building2, Check, Loader2, X } from "lucide-react";

export default function CreateOrganizationModal({ open, onClose, onCreate, creating = false, error = "" }) {
  const [name, setName] = useState("");
  const titleId = useId();
  const inputRef = useRef(null);
  const creatingRef = useRef(creating);
  const onCloseRef = useRef(onClose);

  creatingRef.current = creating;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setName("");
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !creatingRef.current) onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const trimmedName = name.trim();
  const initial = trimmedName.charAt(0).toUpperCase() || "O";

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center px-4 py-6"
      style={{ background: "rgba(0,0,0,.78)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) onClose();
      }}
    >
      <div className="w-full max-w-[520px] overflow-hidden rounded-md border" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-start justify-between border-b px-6 py-5" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(0,229,255,.10)", color: "var(--color-accent)" }}>
              <Building2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-accent)" }}>Workspace</p>
              <h2 id={titleId} className="mt-1 text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>Create an organization</h2>
              <p className="mt-1 text-sm leading-5" style={{ color: "var(--color-text-secondary)" }}>Create a separate OTTO workspace with its own catalog and tenant data.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={creating} aria-label="Close" className="rounded-md p-2 transition-colors disabled:opacity-40" style={{ color: "var(--color-text-secondary)" }} onMouseEnter={(event) => { event.currentTarget.style.background = "var(--color-surface-elevated)"; }} onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={async (event) => { event.preventDefault(); if (trimmedName && !creating) await onCreate(trimmedName); }}>
          <div className="space-y-5 px-6 py-6">
            <div>
              <label htmlFor="organization-name" className="mb-2 block text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Organization name</label>
              <input
                ref={inputRef}
                id="organization-name"
                name="organizationName"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Nkosi Music Group"
                maxLength={120}
                autoComplete="organization"
                disabled={creating}
                className="h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors"
                style={{ background: "var(--color-background)", borderColor: error ? "var(--color-danger)" : "var(--color-border)", color: "var(--color-text-primary)" }}
                onFocus={(event) => { event.currentTarget.style.borderColor = "var(--color-accent)"; event.currentTarget.style.boxShadow = "var(--ring-accent)"; }}
                onBlur={(event) => { event.currentTarget.style.borderColor = error ? "var(--color-danger)" : "var(--color-border)"; event.currentTarget.style.boxShadow = "none"; }}
              />
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>Use the name your team will recognize in the workspace switcher.</p>
            </div>

            <div className="border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-secondary)" }}>Workspace boundary</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Owner", "You become the owner."],
                  ["Separate", "Its catalog stays isolated."],
                  ["Active", "OTTO switches into it."],
                ].map(([label, description]) => (
                  <div key={label} className="rounded-md border p-3" style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}>
                    <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: "rgba(0,229,255,.10)", color: "var(--color-accent)" }}><Check size={13} /></div>
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{label}</p>
                    <p className="mt-1 text-[11px] leading-4" style={{ color: "var(--color-text-secondary)" }}>{description}</p>
                  </div>
                ))}
              </div>
            </div>

            {trimmedName && (
              <div className="flex items-center gap-3 border px-3 py-3 rounded-md" style={{ borderColor: "var(--color-border)" }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-bold" style={{ background: "var(--color-accent)", color: "var(--color-background)" }}>{initial}</div>
                <div className="min-w-0"><p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{trimmedName}</p><p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>New OTTO organization</p></div>
              </div>
            )}

            {error && <p role="alert" className="rounded-md border px-3 py-2 text-xs" style={{ borderColor: "rgba(239,68,68,.35)", background: "rgba(239,68,68,.08)", color: "#FCA5A5" }}>{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 border-t px-6 py-4" style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}>
            <button type="button" onClick={onClose} disabled={creating} className="rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40" style={{ color: "var(--color-text-secondary)" }}>Cancel</button>
            <button type="submit" disabled={!trimmedName || creating} className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40" style={{ background: "var(--color-accent)", color: "var(--color-background)" }}>
              {creating && <Loader2 size={15} className="animate-spin" />}
              {creating ? "Creating organization…" : "Create organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
