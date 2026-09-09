"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const columns = [
  { key: "title", label: "Title", sortable: true },
  {
    key: "writers",
    label: "Writers",
    sortable: false,
    render: (row: any) => {
      const writers = Array.isArray(row.contributors) ? row.contributors : [];
      return writers.length ? writers.map((writer: any) => writer.name).join(", ") : "—";
    },
  },
  { key: "iswc_code", label: "ISWC", sortable: true, render: (row: any) => row.iswc_code || "—" },
  { key: "status", label: "Status", sortable: true, render: (row: any) => row.status || "draft" },
];

export default function WorksPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newWork, setNewWork] = useState({
    title: "",
    workId: "",
    iswcCode: "",
    workType: "composition",
    status: "draft",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/works?limit=50");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      const aggregates = await Promise.all(
        items.map(async (item: any) => {
          try {
            const detail = await api.get(`/works?id=${item.id}`);
            return detail.data;
          } catch {
            return item;
          }
        }),
      );
      setData(aggregates);
    } catch (err) {
      console.error("Failed to fetch works:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((work) => {
      const writers = Array.isArray(work.contributors)
        ? work.contributors.map((writer: any) => writer.name).join(" ")
        : "";
      return !query || [work.title, work.iswc_code, work.status, writers]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [data, search]);

  const handleDelete = async (row: any) => {
    if (!window.confirm(`Delete work "${row.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/works?id=${row.id}`);
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to delete work");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: created } = await api.post("/works", {
        workId: newWork.workId || null,
        title: newWork.title,
        iswcCode: newWork.iswcCode || null,
        workType: newWork.workType || null,
        status: newWork.status || "draft",
      });
      setShowAddModal(false);
      setNewWork({ title: "", workId: "", iswcCode: "", workType: "composition", status: "draft" });
      router.push(`/catalog/works/${created.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create work");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Works"
        subtitle="Manage musical works, authorship, publishing and registrations"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Work
          </Button>
        }
      />

      <section className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between" aria-label="Work catalogue controls">
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, writer, ISWC..."
            aria-label="Search works"
            className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/50"
          />
        </div>
        <Button variant="secondary" size="sm" icon={SlidersHorizontal} aria-label="Filter works">
          Filter
        </Button>
      </section>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/works/${row.id}`)}
        onEdit={(row: any) => router.push(`/catalog/works/${row.id}`)}
        onDelete={handleDelete}
      />

      {!loading && search && filteredData.length === 0 && data.length > 0 && (
        <p className="-mt-3 text-xs text-text-secondary">No works match “{search}”.</p>
      )}

      <EntityForm title="New Work" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Title *</label>
            <input className="input w-full" value={newWork.title} onChange={(e) => setNewWork({ ...newWork, title: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-text-secondary font-bold">Work ID</label>
              <input className="input w-full" value={newWork.workId} onChange={(e) => setNewWork({ ...newWork, workId: e.target.value })} placeholder="Optional external work ID" />
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold">ISWC</label>
              <input className="input w-full" value={newWork.iswcCode} onChange={(e) => setNewWork({ ...newWork, iswcCode: e.target.value })} placeholder="e.g. T-123456789-0" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs text-text-secondary font-bold">Work Type</label>
              <select className="input w-full" value={newWork.workType} onChange={(e) => setNewWork({ ...newWork, workType: e.target.value })}>
                <option value="composition">Composition</option>
                <option value="arrangement">Arrangement</option>
                <option value="adaptation">Adaptation</option>
                <option value="translation">Translation</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary font-bold">Status</label>
              <select className="input w-full" value={newWork.status} onChange={(e) => setNewWork({ ...newWork, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="registered">Registered</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
