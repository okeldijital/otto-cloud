"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import AddContractWizard from "@/components/contracts/AddContractWizard";
import api from "@/lib/api";

const columns = [
  { key: "title", label: "Title", sortable: true },
  { key: "status", label: "Status", sortable: true, render: (row: any) => row.status || "—" },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    render: (row: any) => row.created_at ? new Date(row.created_at).toLocaleDateString() : "—",
  },
];

export default function ContractsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/contracts");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreated = (contract: any) => {
    setIsWizardOpen(false);
    if (contract) {
      setData((current) => [contract, ...current.filter((item) => item.id !== contract.id)]);
    } else {
      fetchData();
    }
  };

  const handleDelete = async (contract: any) => {
    if (!contract?.id || deletingId !== null) return;

    const status = String(contract.status || "Draft").toLowerCase();
    if (!["draft", "pending_verification"].includes(status)) {
      window.alert("Only failed or unverified intake records can be deleted. Verified or linked contracts are protected.");
      return;
    }

    const confirmed = window.confirm(
      `Delete “${contract.title || "Untitled contract"}”?\n\nThis permanently removes this failed/draft intake record. Verified or linked contracts cannot be deleted.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(contract.id);
      await api.delete(`/contracts/delete?id=${encodeURIComponent(contract.id)}`);
      setData((current) => current.filter((item) => item.id !== contract.id));
    } catch (err: any) {
      console.error("Failed to delete contract:", err);
      window.alert(err?.response?.data?.error || "Unable to delete this contract.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        subtitle="Digital contract registry"
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsWizardOpen(true)}>
            <Plus size={16} />
            Add Contract
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onRowClick={(row: any) => window.location.href = `/admin-of-works/contracts/${row.id}`}
        onEdit={(row: any) => window.location.href = `/admin-of-works/contracts/${row.id}`}
        onDelete={handleDelete}
      />
      <AddContractWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
