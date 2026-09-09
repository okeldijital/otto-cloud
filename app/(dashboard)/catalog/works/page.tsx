"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal, Users, Building2, ShieldCheck } from "lucide-react";
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
    originalWorkTitle: "",
    firstReleaseDate: "",
    contributorName: "",
    contributorRole: "composer",
    contributorShare: "",
    controlledShare: "",
    contributorArtistId: "",
    contributorIpi: "",
    contributorEmail: "",
    contributorPhone: "",
    contributorProId: "",
    contributorPublisherId: "",
  });
  const [artists, setArtists] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [publishers, setPublishers] = useState<any[]>([]);

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

  useEffect(() => {
    if (!showAddModal) return;
    Promise.all([api.get("/artists"), api.get("/pros"), api.get("/publishers")])
      .then(([artistsResponse, prosResponse, publishersResponse]) => {
        setArtists(Array.isArray(artistsResponse.data) ? artistsResponse.data : artistsResponse.data?.items || []);
        setPros(Array.isArray(prosResponse.data) ? prosResponse.data : prosResponse.data?.items || []);
        setPublishers(Array.isArray(publishersResponse.data) ? publishersResponse.data : publishersResponse.data?.items || []);
      })
      .catch((err) => console.error("Failed to load Work reference data:", err));
  }, [showAddModal]);

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

  const handleArtistSelection = (artistId: string) => {
    const artist = artists.find((item) => String(item.id) === artistId);
    setNewWork((current) => ({
      ...current,
      contributorArtistId: artistId,
      contributorName: artist?.name || current.contributorName,
      contributorIpi: artist?.ipi_number || "",
      contributorEmail: artist?.contact_email || "",
      contributorPhone: artist?.contact_phone || "",
      contributorProId: artist?.pro_id == null ? "" : String(artist.pro_id),
      contributorPublisherId: artist?.publisher_id == null ? "" : String(artist.publisher_id),
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWork.title.trim()) return;
    if (newWork.contributorShare && (Number(newWork.contributorShare) < 0 || Number(newWork.contributorShare) > 100)) {
      alert("Writer split must be between 0 and 100.");
      return;
    }
    setIsSubmitting(true);
    try {
      const contributors = newWork.contributorName.trim()
        ? [{
            partyType: "artist",
            partyEntityId: newWork.contributorArtistId || null,
            name: newWork.contributorName.trim(),
            role: newWork.contributorRole,
            sharePercent: newWork.contributorShare === "" ? null : Number(newWork.contributorShare),
            controlledSharePercent: newWork.controlledShare === "" ? null : Number(newWork.controlledShare),
            contactEmail: newWork.contributorEmail || null,
            contactPhone: newWork.contributorPhone || null,
            ipiNumber: newWork.contributorIpi || null,
            proId: newWork.contributorProId ? Number(newWork.contributorProId) : null,
            publisherId: newWork.contributorPublisherId ? Number(newWork.contributorPublisherId) : null,
          }]
        : [];

      const { data: created } = await api.post("/works", {
        workId: newWork.workId || null,
        title: newWork.title.trim(),
        iswcCode: newWork.iswcCode || null,
        workType: newWork.workType || null,
        status: newWork.status || "draft",
        originalWorkTitle: newWork.originalWorkTitle || null,
        firstReleaseDate: newWork.firstReleaseDate || null,
        contributors,
      });
      setShowAddModal(false);
      setNewWork({
        title: "", workId: "", iswcCode: "", workType: "composition", status: "draft", originalWorkTitle: "", firstReleaseDate: "",
        contributorName: "", contributorRole: "composer", contributorShare: "", controlledShare: "", contributorArtistId: "", contributorIpi: "", contributorEmail: "", contributorPhone: "", contributorProId: "", contributorPublisherId: "",
      });
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
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, writer, ISWC..." aria-label="Search works" className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/50" />
        </div>
        <Button variant="secondary" size="sm" icon={SlidersHorizontal} aria-label="Filter works">Filter</Button>
      </section>

      <DataTable columns={columns} data={filteredData} isLoading={loading} onRowClick={(row: any) => router.push(`/catalog/works/${row.id}`)} onEdit={(row: any) => router.push(`/catalog/works/${row.id}`)} onDelete={handleDelete} />

      {!loading && search && filteredData.length === 0 && data.length > 0 && <p className="-mt-3 text-xs text-text-secondary">No works match “{search}”.</p>}

      <EntityForm title="New Work" isOpen={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={handleCreate} isSubmitting={isSubmitting} error={undefined}>
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-2"><span className="rounded-md bg-accent/10 p-2 text-accent">01</span><div><h3 className="text-sm font-bold">Work Identity</h3><p className="text-xs text-text-secondary">Define the composition before adding its rights relationships.</p></div></div>
            <div className="space-y-4">
              <div><label className="text-xs text-text-secondary font-bold">Title *</label><input className="input w-full" value={newWork.title} onChange={(e) => setNewWork({ ...newWork, title: e.target.value })} required autoFocus /></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="text-xs text-text-secondary font-bold">Work ID</label><input className="input w-full" value={newWork.workId} onChange={(e) => setNewWork({ ...newWork, workId: e.target.value })} placeholder="Optional external work ID" /></div>
                <div><label className="text-xs text-text-secondary font-bold">ISWC</label><input className="input w-full" value={newWork.iswcCode} onChange={(e) => setNewWork({ ...newWork, iswcCode: e.target.value })} placeholder="e.g. T-123456789-0" /></div>
                <div><label className="text-xs text-text-secondary font-bold">Work Type</label><select className="input w-full" value={newWork.workType} onChange={(e) => setNewWork({ ...newWork, workType: e.target.value })}><option value="composition">Composition</option><option value="arrangement">Arrangement</option><option value="adaptation">Adaptation</option><option value="translation">Translation</option></select></div>
                <div><label className="text-xs text-text-secondary font-bold">Status</label><select className="input w-full" value={newWork.status} onChange={(e) => setNewWork({ ...newWork, status: e.target.value })}><option value="draft">Draft</option><option value="pending">Pending</option><option value="registered">Registered</option><option value="rejected">Rejected</option></select></div>
                <div><label className="text-xs text-text-secondary font-bold">Original Work Title</label><input className="input w-full" value={newWork.originalWorkTitle} onChange={(e) => setNewWork({ ...newWork, originalWorkTitle: e.target.value })} /></div>
                <div><label className="text-xs text-text-secondary font-bold">First Release Date</label><input className="input w-full" type="date" value={newWork.firstReleaseDate} onChange={(e) => setNewWork({ ...newWork, firstReleaseDate: e.target.value })} /></div>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="mb-3 flex items-center gap-2"><Users size={18} className="text-accent" /><div><h3 className="text-sm font-bold">Initial Contributor</h3><p className="text-xs text-text-secondary">Capture the first writer now. Additional writers, splits and relationships are managed in the Work editor.</p></div></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><label className="text-xs text-text-secondary font-bold">Catalogue Artist</label><select className="input w-full" value={newWork.contributorArtistId} onChange={(e) => handleArtistSelection(e.target.value)}><option value="">Select an artist or enter a name below...</option>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.name}</option>)}</select></div>
              <div><label className="text-xs text-text-secondary font-bold">Writer / Contributor Name</label><input className="input w-full" value={newWork.contributorName} onChange={(e) => setNewWork({ ...newWork, contributorName: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Copyright Role</label><select className="input w-full" value={newWork.contributorRole} onChange={(e) => setNewWork({ ...newWork, contributorRole: e.target.value })}><option value="composer">Composer</option><option value="lyricist">Lyricist</option><option value="songwriter">Songwriter</option><option value="arranger">Arranger</option><option value="producer">Producer</option><option value="adapter">Adapter</option><option value="translator">Translator</option></select></div>
              <div><label className="text-xs text-text-secondary font-bold">IPI / CAE</label><input className="input w-full" value={newWork.contributorIpi} onChange={(e) => setNewWork({ ...newWork, contributorIpi: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Writer Split %</label><input className="input w-full" type="number" min="0" max="100" step="0.01" value={newWork.contributorShare} onChange={(e) => setNewWork({ ...newWork, contributorShare: e.target.value })} placeholder="e.g. 50" /></div>
              <div><label className="text-xs text-text-secondary font-bold">Controlled Split %</label><input className="input w-full" type="number" min="0" max="100" step="0.01" value={newWork.controlledShare} onChange={(e) => setNewWork({ ...newWork, controlledShare: e.target.value })} placeholder="e.g. 50" /></div>
              <div><label className="text-xs text-text-secondary font-bold">Contributor PRO</label><select className="input w-full" value={newWork.contributorProId} onChange={(e) => setNewWork({ ...newWork, contributorProId: e.target.value })}><option value="">Not specified</option>{pros.map((pro) => <option key={pro.id} value={pro.id}>{pro.name}</option>)}</select></div>
              <div><label className="text-xs text-text-secondary font-bold">Publishing Company</label><select className="input w-full" value={newWork.contributorPublisherId} onChange={(e) => setNewWork({ ...newWork, contributorPublisherId: e.target.value })}><option value="">Not specified</option>{publishers.map((publisher) => <option key={publisher.id} value={publisher.id}>{publisher.name}</option>)}</select></div>
              <div><label className="text-xs text-text-secondary font-bold">Email</label><input className="input w-full" type="email" value={newWork.contributorEmail} onChange={(e) => setNewWork({ ...newWork, contributorEmail: e.target.value })} /></div>
              <div><label className="text-xs text-text-secondary font-bold">Phone</label><input className="input w-full" value={newWork.contributorPhone} onChange={(e) => setNewWork({ ...newWork, contributorPhone: e.target.value })} /></div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-border pt-5 text-xs text-text-secondary md:grid-cols-3">
            <div className="flex gap-2"><Building2 size={16} className="shrink-0" /><span>Publishing can be expanded after creation.</span></div>
            <div className="flex gap-2"><ShieldCheck size={16} className="shrink-0" /><span>PRO registrations are managed in the full editor.</span></div>
            <div className="flex gap-2"><Users size={16} className="shrink-0" /><span>Multiple contributors and recordings are available after creation.</span></div>
          </div>
        </div>
      </EntityForm>
    </div>
  );
}
