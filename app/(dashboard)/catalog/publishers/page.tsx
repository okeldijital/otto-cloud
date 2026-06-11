"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "code", label: "Code", render: (row: any) => row.code || "—" },
];

export default function PublishersPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPublisher, setNewPublisher] = useState<any>({ name: "", code: "" });

  const fetchData = async () => {
    try {
      const res = await api.get("/publishers");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch publishers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete publisher "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/publishers?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete publisher");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/publishers", newPublisher);
      setShowAddModal(false);
      setNewPublisher({ name: "", code: "" });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create publisher");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Publishers"
        subtitle="Manage publishing relationships"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Publisher
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onEdit={(row: any) => router.push(`/catalog/publishers/${row.id}`)}
        onDelete={handleDelete}
      />

      <EntityForm title="New Publisher" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="input w-full" value={newPublisher.name} onChange={(e) => setNewPublisher({ ...newPublisher, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Code</label>
            <input className="input w-full" value={newPublisher.code} onChange={(e) => setNewPublisher({ ...newPublisher, code: e.target.value })} />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
