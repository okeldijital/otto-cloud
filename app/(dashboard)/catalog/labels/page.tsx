"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import EntityArtwork from "@/components/media/EntityArtwork";
import { useAttachmentMap } from "@/hooks/useAttachment";
import api from "@/lib/api";

const emptyLabel = () => ({
  name: "",
  label_id: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  address: "",
  logo_url: "",
});

export default function LabelsPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLabel, setNewLabel] = useState<any>(emptyLabel());
  const ids = useMemo(() => data.map((label) => label.id), [data]);
  const { urls: logoUrls } = useAttachmentMap("label", ids);

  const columns = useMemo(() => [
    {
      key: "avatar",
      label: "",
      render: (row: any) => (
        <EntityArtwork
          entityType="label"
          entityId={row.id}
          src={logoUrls[String(row.id)] ?? null}
          alt={row.name}
          size={40}
          placeholder="label"
          className="rounded-lg"
          style={{ borderRadius: 8 }}
        />
      ),
    },
    { key: "name", label: "Name", sortable: true },
    { key: "label_id", label: "Label ID", render: (row: any) => row.label_id || "—" },
  ], [logoUrls]);

  const fetchData = async () => {
    try {
      const res = await api.get("/labels");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch labels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete label "${row.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/labels?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete label");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.name.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post("/labels", {
        ...newLabel,
        name: newLabel.name.trim(),
        label_id: newLabel.label_id.trim() || null,
        contact_person: newLabel.contact_person.trim() || null,
        contact_email: newLabel.contact_email.trim() || null,
        contact_phone: newLabel.contact_phone.trim() || null,
        website: newLabel.website.trim() || null,
        address: newLabel.address.trim() || null,
        logo_url: newLabel.logo_url.trim() || null,
      });
      setShowAddModal(false);
      setNewLabel(emptyLabel());
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create label");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labels"
        subtitle="Manage label identity, contacts and catalogue relationships"
        actions={<Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}><Plus size={16} />Add Label</Button>}
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/labels/${row.id}`)}
        onEdit={(row: any) => router.push(`/catalog/labels/${row.id}`)}
        onDelete={handleDelete}
      />

      <EntityForm title="New Label" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-5">
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Identity</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs text-text-secondary font-bold">Name *</label>
                <input className="input w-full" value={newLabel.name} onChange={(e) => setNewLabel({ ...newLabel, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold">Label ID</label>
                <input className="input w-full" value={newLabel.label_id} onChange={(e) => setNewLabel({ ...newLabel, label_id: e.target.value })} placeholder="e.g. OTR" />
              </div>
              <div>
                <label className="text-xs text-text-secondary font-bold">Logo URL</label>
                <input className="input w-full" value={newLabel.logo_url} onChange={(e) => setNewLabel({ ...newLabel, logo_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Contact</div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="text-xs text-text-secondary font-bold">Contact Person</label><input className="input w-full" value={newLabel.contact_person} onChange={(e) => setNewLabel({ ...newLabel, contact_person: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Email</label><input className="input w-full" type="email" value={newLabel.contact_email} onChange={(e) => setNewLabel({ ...newLabel, contact_email: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Phone</label><input className="input w-full" value={newLabel.contact_phone} onChange={(e) => setNewLabel({ ...newLabel, contact_phone: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Website</label><input className="input w-full" value={newLabel.website} onChange={(e) => setNewLabel({ ...newLabel, website: e.target.value })} placeholder="https://..." /></div>
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">Address</div>
            <textarea className="input min-h-24 w-full" value={newLabel.address} onChange={(e) => setNewLabel({ ...newLabel, address: e.target.value })} placeholder="Registered or operating address" />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
