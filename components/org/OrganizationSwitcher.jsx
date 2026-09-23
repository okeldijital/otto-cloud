"use client";

import React, { useEffect, useRef, useState } from "react";
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
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

  const handleCreate = async (event) => {
    event.preventDefault();
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
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-elevated transition-colors max-w-[260px]"
        aria-expanded={open}
        aria-label="Switch organization"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: currentOrg?.brand_color || "#6366f1" }}
        />
        <span className="truncate hidden sm:block">{displayName}</span>
        <ChevronDown
          size={14}
          className={`text-text-secondary shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-72 bg-surface-elevated rounded-xl shadow-lg p-2 z-dropdown">
          <div className="px-3 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            Organizations
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-3 py-5 text-center text-sm text-text-secondary">Loading...</div>
            ) : organizations.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-text-secondary">No organizations yet</div>
            ) : (
              organizations.map((org) => {
                const name = org.display_name || org.name;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSwitch(org.id)}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      org.id === currentOrg?.id
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface",
                    ].join(" ")}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: org.brand_color || "#6366f1", color: "#fff" }}
                    >
                      {(name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium truncate">{name}</div>
                      <div className="text-[10px] text-text-secondary capitalize">
                        {org.org_type?.replace(/_/g, " ") || "Record Label"}
                      </div>
                    </div>
                    {org.id === currentOrg?.id && <Check size={14} className="text-accent shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {showCreate ? (
            <div className="mt-1 p-2">
              <form onSubmit={handleCreate} className="space-y-2">
                <input
                  className="input w-full text-sm"
                  placeholder="Organization name"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  autoFocus
                />
                {error && <p className="text-xs text-danger px-1">{error}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="flex-1 px-3 py-2 bg-accent text-background text-xs font-bold rounded-lg hover:bg-accent-soft disabled:opacity-50 transition-colors"
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreate(false);
                      setError("");
                    }}
                    className="px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
            >
              <Plus size={14} />
              Create Organization
            </button>
          )}
        </div>
      )}
    </div>
  );
}
