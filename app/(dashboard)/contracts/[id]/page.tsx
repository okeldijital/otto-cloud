"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, FileText, Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EntityForm from "@/components/EntityForm";
import ContractDocumentsSection from "@/components/contracts/ContractDocumentsSection";
import ContractRelationshipsSection from "@/components/contracts/ContractRelationshipsSection";
import api from "@/lib/api";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contracts?id=${id}`);
      setContract(res.data);
      setNotes(res.data?.notes || "");
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load contract.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchContract();
  }, [fetchContract]);

  const saveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put(`/contracts?id=${id}`, { notes });
      setContract((current: any) => ({ ...current, ...res.data }));
      setNotesOpen(false);
    } catch (err: any) {
      window.alert(err?.response?.data?.error || "Unable to save notes.");
    }
  };

  const deleteContract = async () => {
    if (!window.confirm("Delete this contract? This removes the contract record and its stored document.")) return;
    try {
      await api.delete(`/contracts/delete?id=${id}`);
      router.push("/contracts");
    } catch (err: any) {
      window.alert(err?.response?.data?.error || "Unable to delete this contract.");
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading contract…</div>;
  if (error || !contract) return <div className="p-12 text-center text-danger">{error || "Contract not found"}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={contract.title || "Contract"}
        subtitle={<span className="font-mono">{contract.contract_number || "No contract number"}</span>}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/contracts")}>
              <ChevronLeft size={14} /> Contracts
            </Button>
            <Button variant="danger" size="sm" onClick={deleteContract}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)] gap-6">
        <Card title="Source Document" subtitle="The signed PDF is the authoritative contract record.">
          <ContractDocumentsSection contractId={id} />
        </Card>

        <Card
          title="Contract Details"
          headerAction={
            <Button variant="ghost" size="sm" onClick={() => setNotesOpen(true)}>
              <Pencil size={14} /> Notes
            </Button>
          }
        >
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-secondary">Contract</p>
              <p className="text-sm font-medium text-white mt-1">{contract.title || "Untitled contract"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-secondary">Created</p>
              <p className="text-sm text-text-primary mt-1">
                {contract.created_at ? new Date(contract.created_at).toLocaleString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-text-secondary">Notes</p>
              <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">
                {contract.notes || "No notes captured."}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <ContractRelationshipsSection contractId={id} />

      <EntityForm
        title="Contract Notes"
        isOpen={notesOpen}
        onClose={() => setNotesOpen(false)}
        onSubmit={saveNotes}
        isSubmitting={false}
        error={undefined}
      >
        <label className="space-y-2 block">
          <span className="text-xs text-text-secondary">Notes</span>
          <textarea
            className="input w-full min-h-32"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional administrative notes"
          />
        </label>
      </EntityForm>
    </div>
  );
}
