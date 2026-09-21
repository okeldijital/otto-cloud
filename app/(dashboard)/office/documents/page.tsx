
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
type ViewMode = "folders" | "list";
type SortKey = "name" | "createdAt" | "fileSize";

function formatSize(bytes: number | null) {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return String(bytes) + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function labelForType(mimeType: string, category: string) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.includes("word")) return "DOC";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "XLS";
  if (mimeType.startsWith("image/")) return "Image";
  return category === "document" ? "Document" : category;
}

function iconForType(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return FileArchive;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("json") || mimeType.includes("text/")) return FileCode2;
  return FileText;
}

function compareDocuments(a: DocumentItem, b: DocumentItem, key: SortKey) {
  if (key === "name") return a.name.localeCompare(b.name);
  if (key === "fileSize") return (a.fileSize || 0) - (b.fileSize || 0);
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export default function OfficeDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, attached: 0, unlinked: 0, folders: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [view, setView] = useState<ViewMode>("folders");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDescending, setSortDescending] = useState(true);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const entityTypes = useMemo(() => [
    "all",
    ...Array.from(new Set(documents.map((doc) => doc.entityType).filter(Boolean) as string[])).sort(),
  ], [documents]);

  const categories = useMemo(() => [
    "all",
    ...Array.from(new Set(documents.map((doc) => doc.category).filter(Boolean) as string[])).sort(),
  ], [documents]);

  const sources = useMemo(() => [
    "all",
    ...Array.from(new Set(documents.map((doc) => doc.source))).sort(),
  ], [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = documents.filter((document) => {
      if (entityType !== "all" && document.entityType !== entityType) return false;
      if (category !== "all" && document.category !== category) return false;
      if (source !== "all" && document.source !== source) return false;
      if (!q) return true;
      return [
        document.name,
        document.entityLabel,
        document.entityType || "",
        document.mimeType,
        document.category,
        document.folderName,
        document.description || "",
      ].join(" ").toLowerCase().includes(q);
    });

    return result.sort((a, b) => {
      const comparison = compareDocuments(a, b, sortKey);
      return sortDescending ? -comparison : comparison;
    });
  }, [documents, entityType, category, source, query, sortKey, sortDescending]);

  const folders = useMemo(() => {
    const map = new Map<string, DocumentItem[]>();
    filtered.forEach((document) => {
      const key = document.folderName || "General";
      map.set(key, [...(map.get(key) || []), document]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const hasFilters = Boolean(query.trim()) || entityType !== "all" || category !== "all" || source !== "all";

  const clearFilters = () => {
    setQuery("");
    setEntityType("all");
    setCategory("all");
    setSource("all");
  };

  const toggleFolder = (name: string) => {
    setOpenFolders((current) => ({ ...current, [name]: !(current[name] ?? true) }));
  };

  const setAllFolders = (open: boolean) => {
    setOpenFolders(Object.fromEntries(folders.map(([name]) => [name, open])));
  };

  const copyLink = async (document: DocumentItem) => {
    if (!document.downloadUrl) return;
    try {
      await navigator.clipboard.writeText(window.location.origin + document.downloadUrl);
      setCopiedId(document.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  };

  const renderDocumentRow = (document: DocumentItem) => {
    const Icon = iconForType(document.mimeType);

    return (
      <div
        key={document.source + ":" + document.id}
        className="group flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-elevated/60"
      >
        <div className="flex min-w-[300px] flex-1 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-elevated text-text-secondary">
            <Icon size={16} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{document.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-secondary">
              <span>{document.entityLabel}</span>
              <span>·</span>
              <span>{document.source === "platform" ? "Platform" : "Release file"}</span>
            </div>
          </div>
        </div>

        <Badge variant="neutral" size="sm">{labelForType(document.mimeType, document.category)}</Badge>
        <span className="w-24 text-right text-xs text-text-secondary">{formatSize(document.fileSize)}</span>
        <span className="w-28 text-right text-xs text-text-secondary">{formatDate(document.createdAt)}</span>

        <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
          {document.downloadUrl ? (
            <>
              <a
                href={document.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                title="Open document"
              >
                <Download size={14} />
                Open
                <ExternalLink size={11} />
              </a>
              <button
                type="button"
                onClick={() => void copyLink(document)}
                className="inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-semibold text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
                title="Copy document link"
              >
                {copiedId === document.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </>
          ) : (
            <span className="px-2 text-xs text-text-secondary">No link</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="A governed document workspace for files attached across OTTO."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Documents", summary.total],
          ["Linked", summary.attached],
          ["Unlinked", summary.unlinked],
          ["Folders", summary.folders],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-2xl font-semibold text-text-primary">{value}</p>
            <p className="mt-1 text-xs text-text-secondary">{label}</p>
          </Card>
        ))}
      </div>

      <Card noPadding>
        <div className="border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-[280px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3">
              <Search size={15} className="shrink-0 text-text-secondary" />
              <input
                className="h-10 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/70"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files, releases, folders..."
                aria-label="Search documents"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="text-text-secondary hover:text-text-primary" aria-label="Clear search">
                  <X size={15} />
                </button>
              ) : null}
            </div>

            <select className="h-10 rounded-lg border border-border bg-surface-elevated px-3 text-sm text-text-primary outline-none" value={entityType} onChange={(event) => setEntityType(event.target.value)} aria-label="Filter by entity">
              {entityTypes.map((type) => <option key={type} value={type}>{type === "all" ? "Entity: All" : type}</option>)}
            </select>

            <select className="h-10 rounded-lg border border-border bg-surface-elevated px-3 text-sm text-text-primary outline-none" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
              {categories.map((item) => <option key={item} value={item}>{item === "all" ? "Category: All" : item}</option>)}
            </select>

            <select className="h-10 rounded-lg border border-border bg-surface-elevated px-3 text-sm text-text-primary outline-none" value={source} onChange={(event) => setSource(event.target.value)} aria-label="Filter by source">
              {sources.map((item) => <option key={item} value={item}>{item === "all" ? "Source: All" : item === "platform" ? "Platform" : "Release files"}</option>)}
            </select>

            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-elevated p-1">
              <button type="button" onClick={() => setView("folders")} className={"rounded-md px-3 py-1.5 text-xs font-semibold " + (view === "folders" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary")}>Folders</button>
              <button type="button" onClick={() => setView("list")} className={"rounded-md px-3 py-1.5 text-xs font-semibold " + (view === "list" ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary")}>List</button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} />
              <span>Showing {filtered.length} of {documents.length} documents</span>
              {hasFilters ? <button type="button" onClick={clearFilters} className="font-semibold text-primary hover:underline">Clear filters</button> : null}
            </div>

            <div className="flex items-center gap-2">
              <span>Sort</span>
              <select className="rounded-md border border-border bg-surface-elevated px-2 py-1.5 text-xs text-text-primary outline-none" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                <option value="createdAt">Date</option>
                <option value="name">Name</option>
                <option value="fileSize">Size</option>
              </select>
              <button type="button" onClick={() => setSortDescending((current) => !current)} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-surface-elevated" title={sortDescending ? "Descending" : "Ascending"}>
                {sortDescending ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading document repository…</div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-danger">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 text-xs font-semibold text-primary hover:underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={28} className="mx-auto mb-3 text-text-secondary" />
            <h2 className="text-base font-semibold text-text-primary">No documents found</h2>
            <p className="mt-1 text-sm text-text-secondary">{hasFilters ? "Try clearing a filter or changing the search." : "Documents attached through OTTO entity workflows will appear here."}</p>
          </div>
        ) : view === "list" ? (
          <div>
            <div className="hidden items-center gap-3 border-b border-border bg-surface-elevated/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary lg:flex">
              <span className="flex-1">Document</span>
              <span className="w-16 text-center">Type</span>
              <span className="w-24 text-right">Size</span>
              <span className="w-28 text-right">Added</span>
              <span className="w-28" />
            </div>
            {filtered.map(renderDocumentRow)}
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-elevated/30 px-4 py-2">
              <p className="text-xs font-semibold text-text-secondary">Organized by folder</p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setAllFolders(true)} className="text-xs font-semibold text-primary hover:underline">Expand all</button>
                <span className="text-text-secondary">·</span>
                <button type="button" onClick={() => setAllFolders(false)} className="text-xs font-semibold text-primary hover:underline">Collapse all</button>
              </div>
            </div>

            {folders.map(([name, items]) => {
              const open = openFolders[name] ?? false;
              const latest = items[0];
              return (
                <div key={name}>
                  <button type="button" className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-surface-elevated" onClick={() => toggleFolder(name)}>
                    {open ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
                    {open ? <FolderOpen size={18} className="text-primary" /> : <Folder size={18} className="text-primary" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {items.length} file{items.length === 1 ? "" : "s"}{latest?.entityLabel ? " · " + latest.entityLabel : ""}
                      </p>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {items.filter((item) => item.source === "attachment").length} release files
                    </Badge>
                  </button>
                  {open ? <div className="border-t border-border">{items.map(renderDocumentRow)}</div> : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
