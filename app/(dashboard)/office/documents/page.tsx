"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, FileText, Folder, Search, ExternalLink } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

type DocumentItem = {
  id: string;
  source: "platform" | "attachment";
  name: string;
  mimeType: string;
  fileSize: number | null;
  createdAt: string;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string;
  category: string;
  folderName: string;
  description: string | null;
  downloadUrl: string | null;
};

type Summary = { total: number; attached: number; unlinked: number; folders: number };

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

function labelForType(mimeType: string, category: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "DOC";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLS";
  return category === "document" ? "Document" : category;
}

export default function OfficeDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, attached: 0, unlinked: 0, folders: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/office/documents");
      setDocuments(response.data?.items || []);
      setSummary(response.data?.summary || { total: 0, attached: 0, unlinked: 0, folders: 0 });
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const entityTypes = useMemo(() => ["all", ...Array.from(new Set(documents.map((doc) => doc.entityType).filter(Boolean) as string[]))], [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((document) => {
      if (entityType !== "all" && document.entityType !== entityType) return false;
      if (!q) return true;
      return [document.name, document.entityLabel, document.mimeType, document.category, document.folderName, document.description || ""].join(" ").toLowerCase().includes(q);
    });
  }, [documents, entityType, query]);

  const folders = useMemo(() => {
    const map = new Map<string, DocumentItem[]>();
    filtered.forEach((document) => {
      const key = document.folderName || "General";
      map.set(key, [...(map.get(key) || []), document]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const toggleFolder = (name: string) => setOpenFolders((current) => ({ ...current, [name]: !current[name] }));

  return <div className="space-y-6">
    <PageHeader title="Documents" subtitle="One repository for documents attached across OTTO." actions={<Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>Refresh</Button>} />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card><p className="text-2xl font-semibold text-text-primary">{summary.total}</p><p className="mt-1 text-xs text-text-secondary">Documents</p></Card>
      <Card><p className="text-2xl font-semibold text-text-primary">{summary.attached}</p><p className="mt-1 text-xs text-text-secondary">Linked to entities</p></Card>
      <Card><p className="text-2xl font-semibold text-text-primary">{summary.unlinked}</p><p className="mt-1 text-xs text-text-secondary">Unlinked</p></Card>
      <Card><p className="text-2xl font-semibold text-text-primary">{summary.folders}</p><p className="mt-1 text-xs text-text-secondary">Folders</p></Card>
    </div>
    <Card noPadding>
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <select className="h-10 rounded-lg border border-border bg-surface-elevated px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={entityType} onChange={(event) => setEntityType(event.target.value)} aria-label="Filter documents by entity">
          {entityTypes.map((type) => <option key={type} value={type}>{type === "all" ? "Entity: All" : type}</option>)}
        </select>
        <div className="ml-auto flex min-w-[260px] items-center gap-2">
          <Search size={15} className="text-text-secondary" />
          <input className="h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents, folders..." aria-label="Search documents" />
        </div>
      </div>
      {loading ? <div className="p-12 text-center text-text-secondary">Loading document repository…</div> :
       error ? <div className="p-12 text-center text-danger">{error}</div> :
       folders.length === 0 ? <div className="p-12 text-center"><FileText size={28} className="mx-auto mb-3 text-text-secondary" /><h2 className="text-base font-semibold text-text-primary">No documents found</h2><p className="mt-1 text-sm text-text-secondary">Documents attached through OTTO entity workflows will appear here.</p></div> :
       <div className="divide-y divide-border">
         {folders.map(([name, items]) => {
           const open = openFolders[name] ?? false;
           return <div key={name}>
             <button type="button" className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-surface-elevated" onClick={() => toggleFolder(name)}>
               {open ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
               <Folder size={18} className="text-primary" />
               <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-text-primary">{name}</p><p className="text-xs text-text-secondary">{items.length} file{items.length === 1 ? "" : "s"}</p></div>
             </button>
             {open && <div className="border-t border-border">
               {items.map((document) => <div key={`${document.source}:${document.id}`} className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                 <div className="flex min-w-[260px] flex-1 items-center gap-3">
                   <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-elevated text-text-secondary"><FileText size={16} /></div>
                   <div className="min-w-0"><p className="truncate text-sm font-medium text-text-primary">{document.name}</p><p className="mt-0.5 text-xs text-text-secondary">{document.entityLabel} · {document.description || document.category}</p></div>
                 </div>
                 <Badge variant="neutral" size="sm">{labelForType(document.mimeType, document.category)}</Badge>
                 <span className="w-24 text-right text-xs text-text-secondary">{formatSize(document.fileSize)}</span>
                 <span className="w-28 text-right text-xs text-text-secondary">{formatDate(document.createdAt)}</span>
                 {document.downloadUrl ? <a href={document.downloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><Download size={14} />Open<ExternalLink size={12} /></a> : <span className="text-xs text-text-secondary">No download link</span>}
               </div>)}
             </div>}
           </div>;
         })}
       </div>}
    </Card>
  </div>;
}
