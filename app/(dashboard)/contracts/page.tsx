"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AddContractWizard from "@/components/contracts/AddContractWizard";
import api from "@/lib/api";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

export default function ContractsPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWizard, setShowWizard] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/contracts");
      setContracts(Array.isArray(res.data) ? res.data : res.data?.items || []);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load contracts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((contract) =>
      [contract.title, contract.contract_number].some((value) => String(value || "").toLowerCase().includes(q))
    );
  }, [contracts, search]);

  const deleteContract = async (contract: any) => {
    if (!window.confirm(`Delete “${contract.title || "Untitled contract"}”? This removes the contract record and its stored document.`)) return;
    try {
      setDeletingId(contract.id);
      await api.delete(`/contracts/delete?id=${encodeURIComponent(contract.id)}`);
      setContracts((current) => current.filter((item) => item.id !== contract.id));
    } catch (err: any) {
      window.alert(err?.response?.data?.error || "Unable to delete this contract.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        subtitle="Store signed PDFs and connect them to artists, labels, publishers, releases, works and tracks."
        actions={<Button variant="primary" size="sm" onClick={() => setShowWizard(true)}><Plus size={16} /> Add Contract</Button>}
      />

      <Card noPadding>
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search size={16} className="text-text-secondary" />
          <input
            className="input flex-1 max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contracts or contract number…"
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading contracts…</div>
        ) : error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={32} className="mx-auto mb-4 text-text-secondary" />
            <h3 className="text-lg font-semibold text-text-primary">No contracts found</h3>
            <p className="text-sm text-text-secondary mt-2">Upload a signed PDF to create the first contract record.</p>
            <Button variant="primary" size="sm" className="mt-5" onClick={() => setShowWizard(true)}><Plus size={16} /> Upload Contract</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-border">
                  <th className="p-4 font-bold">Contract</th>
                  <th className="p-4 font-bold">Document</th>
                  <th className="p-4 font-bold">Created</th>
                  <th className="p-4 font-bold">Updated</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contract) => {
                  const docCount = contract._count?.documents ?? contract.contract_documents?.length ?? 0;
                  const deletable = ["draft", "pending_verification"].includes(String(contract.status || "").toLowerCase());
                  return (
                    <tr
                      key={contract.id}
                      className="border-b border-border hover:bg-surface-elevated cursor-pointer"
                      onClick={() => router.push(`/contracts/${contract.id}`)}
                    >
                      <td className="p-4">
                        <div className="font-medium text-text-primary">{contract.title || "Untitled contract"}</div>
                        <div className="text-xs text-text-secondary font-mono mt-0.5">{contract.contract_number || "No contract number"}</div>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">
                        <div className="flex items-center gap-2"><FileText size={14} />{docCount > 0 ? "PDF stored" : "No PDF"}</div>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{formatDate(contract.created_at)}</td>
                      <td className="p-4 text-sm text-text-secondary">{formatDate(contract.updated_at)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/contracts/${contract.id}`); }}>Open</Button>
                          {deletable && (
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-secondary hover:text-danger hover:bg-surface-elevated"
                              aria-label={`Delete ${contract.title || "contract"}`}
                              disabled={deletingId !== null}
                              onClick={(e) => { e.stopPropagation(); void deleteContract(contract); }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
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

      <AddContractWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={(created: any) => {
          const contractId = created?.id || created?.contract_id;
          if (contractId) router.push(`/contracts/${contractId}`);
          void fetchData();
        }}
      />
    </div>
  );
}
