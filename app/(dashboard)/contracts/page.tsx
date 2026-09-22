"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Folder, FolderPlus, FileText, Link2, Pencil, Plus, Search, Trash2, Unlink2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AddContractWizard from "@/components/contracts/AddContractWizard";
import api from "@/lib/api";

type ContractFolder = {
  id: string;
  name: string;
  contractCount: number;
};

type ContractRow = {
  id: number;
  title: string;
  contract_number: string;
  status?: string;
  created_at?: string | null;
  updated_at?: string | null;
  _count?: { documents?: number };
  folders?: ContractFolder[];
};

type ViewKey = "all" | "unfiled" | "connected_release" | "unlinked_release" | "recent_added" | "recent_updated";

const VIEWS: Array<{ key: ViewKey; label: string; description: string }> = [
  { key: "all", label: "All Contracts", description: "Every stored contract" },
  { key: "unfiled", label: "Unfiled", description: "Contracts without a folder" },
  { key: "connected_release", label: "Connected to Release", description: "Contracts linked to a release" },
  { key: "unlinked_release", label: "Not Connected to Release", description: "Contracts with no release connection" },
  { key: "recent_added", label: "Recently Added", description: "Newest contracts first" },
  { key: "recent_updated", label: "Recently Updated", description: "Recently changed contracts first" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [folders, setFolders] = useState<ContractFolder[]>([]);
  const [view, setView] = useState<ViewKey>("all");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [organizingId, setOrganizingId] = useState<number | null>(null);
  const [mutatingFolder, setMutatingFolder] = useState(false);

  const fetchFolders = useCallback(async () => {
    try {
      setFoldersLoading(true);
      const res = await api.get("/contracts/folders");
      setFolders(res.data?.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load contract folders.");
    } finally {
      setFoldersLoading(false);
    }
  }, []);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (selectedFolderId) params.set("folderId", selectedFolderId);
      if (view !== "all") params.set("view", view);
      const res = await api.get(`/contracts?${params.toString()}`);
      setContracts(res.data?.items || []);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load contracts.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedFolderId, view]);

  useEffect(() => { void fetchFolders(); }, [fetchFolders]);
  useEffect(() => { void fetchContracts(); }, [fetchContracts]);

  const activeFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) || null,
    [folders, selectedFolderId]
  );

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      setCreatingFolder(true);
      const res = await api.post("/contracts/folders", { name });
      const created = res.data?.item;
      if (created?.id) {
        setFolders((current) => [...current, { ...created, contractCount: 0 }]);
        setSelectedFolderId(created.id);
        setView("all");
      }
      setNewFolderName("");
      setNewFolderOpen(false);
    } catch (err: any) {
      window.alert(err?.response?.data?.error || "Unable to create folder.");
    } finally {
      setCreatingFolder(false);
    }
  };

  const renameFolder = async (folderId: string) => {
    const name = editingFolderName.trim();
    if (!name) return;
    try {
      setMutatingFolder(true);
      const res = await api.put(`/contracts/folders/${folderId}`, { name });
      const updated = res.data?.item;
      if (updated) {
        setFolders((current) => current.map((folder) => folder.id === folderId ? { ...folder, name: updated.name } : folder));
      }
      setEditingFolderId(null);
    } catch (err: any) {
      window.alert(err?.response?.data?.error || "Unable to rename folder.");
    } finally {
      setMutatingFolder(false);
    }
  };

  const deleteFolder = async (folder: ContractFolder) => {
    if (!window.confirm(`Delete the “${folder.name}” folder? Contracts will remain stored; only their folder organisation will be removed.`)) return;
    try {
      setMutatingFolder(true);
      await api.delete(`/contracts/folders/${folder.id}`);
      setFolders((current) => current.filter((item) => item.id !== folder.id));
      if (selectedFolderId === folder.id) setSelectedFolderId(null);
      setOrganizingId(null);
      await fetchContracts();
    } catch (err: any) {
      window.alert(err?.response?.data?.error || "Unable to delete folder.");
    } finally {
      setMutatingFolder(false);
    }
  };

  const toggleFolderMembership = async (contractId: number, folder: ContractFolder) => {
    const contract = contracts.find((item) => item.id === contractId);
    const alreadyInFolder = !!contract?.folders?.some((item) => item.id === folder.id);
    try {
      setMutatingFolder(true);
      if (alreadyInFolder) {
        await api.delete(`/contracts/folders/${folder.id}/contracts/${contractId}`);
      } else {
        await api.post(`/contracts/folders/${folder.id}/contracts`, { contractId });
      }
      await Promise.all([fetchFolders(), fetchContracts()]);
    } catch (err: any) {
      window.alert(err?.response?.data?.error || "Unable to update contract organisation.");
    } finally {
      setMutatingFolder(false);
    }
  };

  const title = activeFolder ? activeFolder.name : VIEWS.find((item) => item.key === view)?.label || "Contracts";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contracts"
        subtitle="Store, organise and retrieve signed contract documents."
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowWizard(true)}>
            <Plus size={16} /> Add Contract
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-4 items-start">
        <Card noPadding>
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Contracts</span>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
              aria-label="Create folder"
              onClick={() => setNewFolderOpen((current) => !current)}
            >
              <FolderPlus size={15} />
            </button>
          </div>

          <div className="p-2">
            {VIEWS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left transition-colors ${!selectedFolderId && view === item.key ? "bg-surface-elevated text-text-primary" : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"}`}
                onClick={() => { setSelectedFolderId(null); setView(item.key); }}
              >
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-2xs text-text-secondary/70 mt-0.5">{item.description}</div>
              </button>
            ))}

            <div className="px-3 pt-4 pb-2 flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-text-secondary">Release Connections</span>
            </div>

            {VIEWS.filter((item) => item.key === "connected_release" || item.key === "unlinked_release").map((item) => (
              <button
                key={item.key}
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left transition-colors ${!selectedFolderId && view === item.key ? "bg-surface-elevated text-text-primary" : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"}`}
                onClick={() => { setSelectedFolderId(null); setView(item.key); }}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  {item.key === "connected_release" ? <Link2 size={14} /> : <Unlink2 size={14} />}
                  <span>{item.label}</span>
                </div>
                <div className="text-2xs text-text-secondary/70 mt-0.5 pl-5">{item.description}</div>
              </button>
            ))}

            <div className="px-3 pt-4 pb-2 flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-text-secondary">Folders</span>
              <button
                type="button"
                className="text-text-secondary hover:text-text-primary"
                aria-label="Create folder"
                onClick={() => setNewFolderOpen(true)}
              >
                <Plus size={14} />
              </button>
            </div>

            {newFolderOpen && (
              <div className="mx-2 mb-2 rounded-lg border border-border bg-surface-elevated p-2">
                <input
                  autoFocus
                  className="input w-full"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void createFolder(); if (e.key === "Escape") setNewFolderOpen(false); }}
                  placeholder="Folder name"
                  maxLength={100}
                />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <Button variant="ghost" size="sm" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" disabled={!newFolderName.trim() || creatingFolder} onClick={() => void createFolder()}>
                    Create
                  </Button>
                </div>
              </div>
            )}

            {foldersLoading ? (
              <div className="px-3 py-4 text-xs text-text-secondary">Loading folders…</div>
            ) : folders.length === 0 ? (
              <div className="px-3 py-4 text-xs text-text-secondary">No folders yet. Create one when you need to organise contracts.</div>
            ) : (
              <div className="space-y-0.5">
                {folders.map((folder) => (
                  <div key={folder.id} className="group flex items-center gap-1">
                    {editingFolderId === folder.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          autoFocus
                          className="input h-8 flex-1 min-w-0"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") void renameFolder(folder.id); if (e.key === "Escape") setEditingFolderId(null); }}
                          maxLength={100}
                        />
                        <button type="button" className="h-8 w-8" onClick={() => setEditingFolderId(null)}><X size={13} /></button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`flex-1 min-w-0 rounded-md px-3 py-2 text-left flex items-center gap-2 ${selectedFolderId === folder.id ? "bg-surface-elevated text-text-primary" : "text-text-secondary hover:bg-surface-elevated hover:text-text-primary"}`}
                          onClick={() => { setSelectedFolderId(folder.id); setView("all"); }}
                        >
                          <Folder size={15} className="shrink-0" />
                          <span className="truncate text-sm">{folder.name}</span>
                          <span className="ml-auto text-2xs text-text-secondary">{folder.contractCount}</span>
                        </button>
                        <div className="hidden group-hover:flex items-center">
                          <button
                            type="button"
                            className="h-8 w-8 text-text-secondary hover:text-text-primary"
                            aria-label={`Rename ${folder.name}`}
                            onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="h-8 w-8 text-text-secondary hover:text-danger"
                            aria-label={`Delete ${folder.name}`}
                            onClick={() => void deleteFolder(folder)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card noPadding>
          <div className="p-4 border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-text-primary">{title}</div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {activeFolder ? "Contracts organised in this folder." : "Stored contracts available in this workspace."}
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0 md:w-[360px]">
                <Search size={16} className="text-text-secondary shrink-0" />
                <input
                  className="input flex-1"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search contracts…"
                  aria-label="Search contracts"
                />
                {search && (
                  <button type="button" className="text-text-secondary hover:text-text-primary" onClick={() => setSearch("")} aria-label="Clear search">
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-text-secondary">Loading contracts…</div>
          ) : error ? (
            <div className="p-12 text-center text-danger">{error}</div>
          ) : contracts.length === 0 ? (
            <div className="p-12 text-center">
              <FileText size={32} className="mx-auto mb-4 text-text-secondary" />
              <h3 className="text-lg font-semibold text-text-primary">{activeFolder ? "No contracts in this folder" : "No contracts found"}</h3>
              <p className="text-sm text-text-secondary mt-2">
                {activeFolder ? "Upload a contract first, then organise it into this folder." : "Upload a signed PDF to create the first contract record."}
              </p>
              <Button variant="primary" size="sm" className="mt-5" onClick={() => setShowWizard(true)}>
                <Plus size={16} /> Upload Contract
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-border">
                    <th className="p-4 font-bold">Contract</th>
                    <th className="p-4 font-bold">Folders</th>
                    <th className="p-4 font-bold">Document</th>
                    <th className="p-4 font-bold">Updated</th>
                    <th className="p-4 font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => {
                    const docCount = contract._count?.documents ?? 0;
                    const organizing = organizingId === contract.id;
                    return (
                      <tr key={contract.id} className="border-b border-border hover:bg-surface-elevated/60 align-top">
                        <td className="p-4 cursor-pointer" onClick={() => router.push(`/contracts/${contract.id}`)}>
                          <div className="font-medium text-text-primary">{contract.title || "Untitled contract"}</div>
                          <div className="text-xs text-text-secondary font-mono mt-0.5">{contract.contract_number || "No contract number"}</div>
                          <div className="text-2xs text-text-secondary mt-1">{formatDate(contract.created_at)}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5 min-w-[180px]">
                            {(contract.folders || []).map((folder) => (
                              <span key={folder.id} className="rounded-full border border-border bg-surface-elevated px-2 py-1 text-2xs text-text-secondary">
                                {folder.name}
                              </span>
                            ))}
                            {(contract.folders || []).length === 0 && (
                              <span className="text-xs text-text-secondary">No folder</span>
                            )}
                          </div>
                          {organizing && (
                            <div className="mt-2 rounded-lg border border-border bg-surface-elevated p-2 space-y-1.5">
                              {folders.length === 0 ? (
                                <div className="text-xs text-text-secondary px-1 py-2">Create a folder first.</div>
                              ) : (
                                folders.map((folder) => {
                                  const checked = !!contract.folders?.some((item) => item.id === folder.id);
                                  return (
                                    <label key={folder.id} className="flex items-center gap-2 px-1 py-1 text-xs text-text-secondary cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={mutatingFolder}
                                        onChange={() => void toggleFolderMembership(contract.id, folder)}
                                      />
                                      <span>{folder.name}</span>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-sm text-text-secondary">
                          <div className="flex items-center gap-2"><FileText size={14} />{docCount > 0 ? "PDF stored" : "No PDF"}</div>
                        </td>
                        <td className="p-4 text-sm text-text-secondary whitespace-nowrap">{formatDate(contract.updated_at)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setOrganizingId(organizing ? null : contract.id)}>
                              {organizing ? "Done" : "Organise"}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/contracts/${contract.id}`)}>Open</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <AddContractWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={(created: any) => {
          const contractId = created?.id || created?.contract_id;
          if (contractId) router.push(`/contracts/${contractId}`);
          void fetchContracts();
          void fetchFolders();
        }}
      />
    </div>
  );
}
