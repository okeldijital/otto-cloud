"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "publisher_id", label: "Publisher ID", render: (row: any) => row.publisher_id || "—" },
];

export default function PublishersPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emptyPublisher = () => ({
  name: "",
  publisher_id: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  address: "",
  rights_type: "",
});
  const [newPublisher, setNewPublisher] = useState<any>(emptyPublisher());

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
      await api.post("/publishers", { ...newPublisher, name: newPublisher.name.trim(), publisher_id: newPublisher.publisher_id.trim() || null, contact_person: newPublisher.contact_person.trim() || null, contact_email: newPublisher.contact_email.trim() || null, contact_phone: newPublisher.contact_phone.trim() || null, website: newPublisher.website.trim() || null, address: newPublisher.address.trim() || null, rights_type: newPublisher.rights_type.trim() || null });
      setShowAddModal(false);
      setNewPublisher(emptyPublisher());
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
        actions={isPlatformAuthority ? (
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Publisher
          </Button>
        ) : undefined}
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/publishers/${row.id}`)}
        onEdit={isPlatformAuthority ? ((row: any) => router.push(`/catalog/publishers/${row.id}`)) : undefined}
        onDelete={isPlatformAuthority ? handleDelete : undefined}
      />

      <EntityForm title="New Publisher" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-6">
          <div>
            <label className="text-xs text-text-secondary font-bold">Name *</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={newPublisher.name} onChange={(e) => setNewPublisher({ ...newPublisher, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Publisher ID</label>
            <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={newPublisher.publisher_id} onChange={(e) => setNewPublisher({ ...newPublisher, publisher_id: e.target.value })} />
          </div>

          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Contact</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-text-secondary font-bold">Contact Person</label>
                <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={newPublisher.contact_person} onChange={(e) => setNewPublisher({ ...newPublisher, contact_person: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold">Email</label>
                <input type="email" className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={newPublisher.contact_email} onChange={(e) => setNewPublisher({ ...newPublisher, contact_email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold">Phone</label>
                <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={newPublisher.contact_phone} onChange={(e) => setNewPublisher({ ...newPublisher, contact_phone: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold">Website</label>
                <input type="url" className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={newPublisher.website} onChange={(e) => setNewPublisher({ ...newPublisher, website: e.target.value })} placeholder="https://..." />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Publishing Profile</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs text-text-secondary font-bold">Rights Type</label>
                <input className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={newPublisher.rights_type} onChange={(e) => setNewPublisher({ ...newPublisher, rights_type: e.target.value })} placeholder="e.g. Publishing Administration" />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-text-secondary font-bold">Address</label>
                <textarea className="min-h-24 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30" value={newPublisher.address} onChange={(e) => setNewPublisher({ ...newPublisher, address: e.target.value })} placeholder="Registered or operating address" />
              </div>
            </div>
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
