"use client";
import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useOrg } from "@/contexts/OrgContext";
import { useRouter } from "next/navigation";
import api from "@/lib/iam-api";

export default function OrganizationSwitcher() {
  const { organizations, currentOrg, switchOrg, loading } = useOrg();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setShowCreate(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitch = async (orgId) => {
    const success = await switchOrg(orgId);
    if (success) {
      setOpen(false);
      router.refresh();
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.post("/auth/organizations", { name: newName.trim() });
      const organizationId = res.data?.organization?.id;
      if (!organizationId) throw new Error("Organization was created without an id");
      setNewName("");
      setShowCreate(false);
      setOpen(false);
      await switchOrg(organizationId);
      router.refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  const displayName = currentOrg?.display_name || currentOrg?.name || "Select Organization";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded-xl hover:bg-white/5 transition-all text-sm font-medium text-text-primary w-full min-w-[180px]"
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentOrg?.brand_color || "#6366f1" }}
        />
        <span className="truncate flex-1 text-left">{displayName}</span>
        <ChevronDown size={14} className={`text-text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-[1002]">
          <div className="p-2 border-b border-border">
            <p className="px-2 py-1 text-[10px] font-bold text-text-secondary uppercase tracking-widest">Organizations</p>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {loading ? (
              <div className="p-4 text-center text-sm text-text-secondary">Loading...</div>
            ) : organizations.length === 0 ? (
              <div className="p-4 text-center text-sm text-text-secondary">No organizations yet</div>
            ) : (
              organizations.map((org) => (
                <button key={org.id} onClick={() => handleSwitch(org.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${org.id === currentOrg?.id ? "bg-accent/10 text-accent" : "text-text-secondary hover:text-text-primary hover:bg-white/5"}`}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: org.brand_color || "#6366f1", color: "#fff" }}>
                    {(org.display_name || org.name).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{org.display_name || org.name}</div>
                    <div className="text-[10px] text-text-secondary capitalize">{org.org_type?.replace(/_/g, " ") || "Record Label"}</div>
                  </div>
                  {org.id === currentOrg?.id && <Check size={14} className="text-accent flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
          {showCreate ? (
            <div className="p-3 border-t border-border">
              <form onSubmit={handleCreate} className="space-y-2">
                <input className="input w-full text-sm" placeholder="Organization name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                {error && <p className="text-xs text-danger">{error}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={creating || !newName.trim()} className="flex-1 px-3 py-1.5 bg-accent text-white text-xs font-bold rounded-lg hover:bg-accent/80 disabled:opacity-50 transition-all">{creating ? "Creating..." : "Create"}</button>
                  <button type="button" onClick={() => { setShowCreate(false); setError(""); }} className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-all">Cancel</button>
                </div>
              </form>
            </div>
          ) : (
            <button onClick={() => setShowCreate(true)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 border-t border-border transition-all">
              <Plus size={14} /> Create Organization
            </button>
          )}
        </div>
      )}
    </div>
  );
}
