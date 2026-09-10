"use client";

import React, { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Plus, Search } from "lucide-react";
import { useOrg } from "@/contexts/OrgContext";
import { useRouter } from "next/navigation";
import CreateOrganizationModal from "./CreateOrganizationModal";

export default function OrganizationSwitcher() {
  const { organizations, currentOrg, switchOrg, createOrganization, loading } = useOrg();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (orgId) => {
    if (orgId === currentOrg?.id) {
      setOpen(false);
      return;
    }
    const success = await switchOrg(orgId);
    if (success) {
      setOpen(false);
      setSearchQuery("");
      router.refresh();
    }
  };

  const handleCreate = async (name) => {
    setCreating(true);
    setCreateError("");
    try {
      const result = await createOrganization(name);
      if (!result.success) {
        setCreateError(result.error || "Failed to create organization");
        return;
      }
      setShowCreate(false);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const query = searchQuery.trim().toLowerCase();
    return !query || org.name.toLowerCase().includes(query) || org.slug?.toLowerCase().includes(query);
  });

  const displayName = currentOrg?.name || "Select organization";
  const currentRole = currentOrg?.role || (currentOrg?.isOwner ? "Owner" : "Member");

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex h-10 min-w-[240px] max-w-[320px] items-center gap-3 rounded-md border px-3 text-left transition-colors"
          style={{
            background: "var(--color-surface)",
            borderColor: open ? "var(--color-accent)" : "var(--color-border)",
            color: "var(--color-text-primary)",
            boxShadow: open ? "var(--ring-accent)" : "none",
          }}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold" style={{ background: "var(--color-accent)", color: "var(--color-background)" }}>
            {currentOrg?.name?.charAt(0).toUpperCase() || <Building2 size={14} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--color-text-secondary)" }}>Workspace</span>
            <span className="block truncate text-sm font-semibold leading-4" style={{ color: "var(--color-text-primary)" }}>{displayName}</span>
          </span>
          <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wide lg:block" style={{ color: "var(--color-text-secondary)" }}>{currentRole}</span>
          <ChevronDown size={15} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--color-text-secondary)" }} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-[1002] mt-2 w-[360px] overflow-hidden rounded-md border shadow-lg" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-lg)" }} role="menu">
            <div className="border-b px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Switch workspace</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>Each workspace has its own catalog and data.</p>
                </div>
                <span className="rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(0,229,255,.08)", color: "var(--color-accent)" }}>{organizations.length}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md border px-3 py-2" style={{ background: "var(--color-surface-elevated)", borderColor: "var(--color-border)" }}>
                <Search size={14} style={{ color: "var(--color-text-secondary)" }} />
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search organizations" aria-label="Search organizations" className="min-w-0 flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--color-text-primary)" }} />
              </div>
            </div>

            <div className="max-h-[340px] overflow-y-auto p-2">
              {loading ? (
                <div className="p-6 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading organizations…</div>
              ) : filteredOrganizations.length === 0 ? (
                <div className="p-6 text-center">
                  <Building2 size={22} className="mx-auto mb-2" style={{ color: "var(--color-text-secondary)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>No organization found</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>Try another name.</p>
                </div>
              ) : (
                filteredOrganizations.map((org) => {
                  const active = org.id === currentOrg?.id;
                  const role = org.role || (org.isOwner ? "Owner" : "Member");
                  return (
                    <button type="button" key={org.id} onClick={() => handleSwitch(org.id)} className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors last:mb-0" style={{ background: active ? "rgba(0,229,255,.08)" : "transparent" }} onMouseEnter={(event) => { if (!active) event.currentTarget.style.background = "var(--color-surface-elevated)"; }} onMouseLeave={(event) => { if (!active) event.currentTarget.style.background = "transparent"; }} role="menuitem">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold" style={{ background: active ? "var(--color-accent)" : "var(--color-surface-elevated)", color: active ? "var(--color-background)" : "var(--color-text-primary)" }}>{org.name.charAt(0).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{org.name}</span>
                        <span className="mt-0.5 block text-xs" style={{ color: "var(--color-text-secondary)" }}>{role}{org.slug ? ` · ${org.slug}` : ""}</span>
                      </span>
                      {active && <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-accent)" }}><Check size={14} /> Active</span>}
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t p-2" style={{ borderColor: "var(--color-border)" }}>
              <button type="button" onClick={() => { setOpen(false); setSearchQuery(""); setCreateError(""); setShowCreate(true); }} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors" style={{ color: "var(--color-text-primary)" }} onMouseEnter={(event) => { event.currentTarget.style.background = "var(--color-surface-elevated)"; }} onMouseLeave={(event) => { event.currentTarget.style.background = "transparent"; }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border" style={{ borderColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}><Plus size={16} /></span>
                <span><span className="block text-sm font-semibold">Create organization</span><span className="mt-0.5 block text-xs" style={{ color: "var(--color-text-secondary)" }}>Start a separate tenant workspace</span></span>
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateOrganizationModal open={showCreate} onClose={() => { if (!creating) { setShowCreate(false); setCreateError(""); } }} onCreate={handleCreate} creating={creating} error={createError} />
    </>
  );
}
