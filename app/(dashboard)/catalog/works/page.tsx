"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import EntityForm from "@/components/EntityForm";
import api from "@/lib/api";

const columns = [
  { key: "title", label: "Title", sortable: true },
  { key: "work_type", label: "Type", sortable: true, render: (row: any) => row.work_type || "—" },
  { key: "iswc", label: "ISWC", sortable: true, render: (row: any) => row.iswc || "—" },
];

export default function WorksPage() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newWork, setNewWork] = useState<any>({ title: "", work_type: "Original", iswc: "" });

  const fetchData = async () => {
    try {
      const res = await api.get("/works");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch works:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const workTypes = useMemo(
    () => Array.from(new Set(data.map((work) => String(work.work_type || "").trim()).filter(Boolean))).sort(),
    [data]
  );

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((work) => {
      const matchesType = typeFilter === "all" || String(work.work_type || "").toLowerCase() === typeFilter;
      const matchesSearch = !query || [work.title, work.work_type, work.iswc]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [data, search, typeFilter]);

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
      await api.post("/works", newWork);
      setShowAddModal(false);
      setNewWork({ title: "", work_type: "Original", iswc: "" });
      fetchData();
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
        subtitle="Manage compositions and arrangements"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Add Work
          </Button>
        }
      />

      <section className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-center md:justify-between" aria-label="Work catalogue controls">
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search works..."
              aria-label="Search works"
              className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/50"
            />
          </div>
          <label className="relative flex h-10 items-center rounded-md border border-border bg-surface px-3 text-sm text-text-secondary">
            <SlidersHorizontal size={16} className="mr-2" />
            <span className="sr-only">Filter by work type</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter works by type"
              className="appearance-none bg-transparent pr-5 text-sm text-text-primary outline-none"
            >
              <option value="all">All types</option>
              {workTypes.map((type) => (
                <option key={type} value={type.toLowerCase()}>{type}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={loading}
        onRowClick={(row: any) => router.push(`/catalog/works/${row.id}`)}
        onEdit={(row: any) => router.push(`/catalog/works/${row.id}`)}
        onDelete={handleDelete}
      />

      {!loading && (search || typeFilter !== "all") && filteredData.length === 0 && data.length > 0 && (
        <p className="-mt-3 text-xs text-text-secondary">No works match the current catalogue filters.</p>
      )}

      <EntityForm title="New Work" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-secondary font-bold">Title *</label>
            <input className="input w-full" value={newWork.title} onChange={(e) => setNewWork({ ...newWork, title: e.target.value })} required />
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">Type</label>
            <select className="input w-full" value={newWork.work_type} onChange={(e) => setNewWork({ ...newWork, work_type: e.target.value })}>
              <option value="Original">Original</option>
              <option value="Arrangement">Arrangement</option>
              <option value="Cover">Cover</option>
              <option value="Remix">Remix</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-text-secondary font-bold">ISWC</label>
            <input className="input w-full" value={newWork.iswc} onChange={(e) => setNewWork({ ...newWork, iswc: e.target.value })} placeholder="e.g. T-123456789-0" />
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
