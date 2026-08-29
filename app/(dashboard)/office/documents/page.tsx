"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Eye, ExternalLink, Plus, Search, Trash2, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

type DocumentRecord = {
  id: string;
  title?: string | null;
  original_filename?: string | null;
  description?: string | null;
  category?: string | null;
  file_type?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  file_url?: string | null;
  created_at?: string | null;
};

type UploadForm = {
  file: File | null;
  title: string;
  description: string;
  category: string;
  file_type: string;
};

const FILE_TYPES = ["pdf", "docx", "xlsx", "image", "audio", "video", "other"];
const EMPTY_UPLOAD: UploadForm = { file: null, title: "", description: "", category: "", file_type: "" };

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

function formatSize(bytes?: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function isImage(type?: string | null) {
  return ["image", "png", "jpg", "jpeg", "gif", "webp"].includes((type || "").toLowerCase());
}

function isPdf(type?: string | null) {
  return ["pdf", "application/pdf"].includes((type || "").toLowerCase());
}

function errorMessage(error: unknown, fallback: string) {
  const value = error as { response?: { data?: { error?: string } } };
  return value.response?.data?.error || fallback;
}

export default function OfficeDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadForm>(EMPTY_UPLOAD);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/office/documents");
      setDocuments(Array.isArray(response.data) ? response.data : response.data?.items || []);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Failed to load documents"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((document) => {
      const title = (document.title || document.original_filename || "").toLowerCase();
      const filename = (document.original_filename || "").toLowerCase();
      const matchesSearch = !query || title.includes(query) || filename.includes(query);
      const matchesType = typeFilter === "All" || (document.file_type || "").toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [documents, search, typeFilter]);

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadForm.file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      if (uploadForm.title) formData.append("title", uploadForm.title);
      if (uploadForm.description) formData.append("description", uploadForm.description);
      if (uploadForm.category) formData.append("category", uploadForm.category);
      if (uploadForm.file_type) formData.append("file_type", uploadForm.file_type);
      await api.post("/office/documents?action=upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setShowUpload(false);
      setUploadForm(EMPTY_UPLOAD);
      await fetchData();
    } catch (err) {
      window.alert(errorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document: DocumentRecord) => {
    const name = document.title || document.original_filename || "this document";
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/office/documents?id=${document.id}`);
      if (selectedDoc?.id === document.id) setSelectedDoc(null);
      await fetchData();
    } catch (err) {
      window.alert(errorMessage(err, "Failed to delete document"));
    }
  };

  const handleView = async (document: DocumentRecord) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/office/documents?id=${document.id}`);
      setSelectedDoc(response.data?.item || response.data);
    } catch (err) {
      window.alert(errorMessage(err, "Failed to load document details"));
    } finally {
      setDetailLoading(false);
    }
  };

  const updateUploadField = (field: keyof UploadForm, event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setUploadForm((current) => ({ ...current, [field]: event.target.value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Manage office documents, files, and assets."
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowUpload(true)}>
            <Plus size={16} /> Upload Document
          </Button>
        }
      />

      <Card noPadding>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <select aria-label="Filter documents by type" className="input w-auto" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="All">Type: All</option>
            {FILE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <div className="ml-auto flex min-w-[240px] items-center gap-2">
            <Search size={16} className="text-text-secondary" aria-hidden="true" />
            <input aria-label="Search documents" className="input w-full" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents..." />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading documents…</div>
        ) : error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            {documents.length === 0 ? (
              <div className="mx-auto max-w-sm space-y-4">
                <h2 className="text-lg font-semibold text-text-primary">No documents yet</h2>
                <p className="text-sm">Upload your first document to get started.</p>
                <Button variant="primary" size="sm" onClick={() => setShowUpload(true)}><Plus size={16} /> Upload Document</Button>
              </div>
            ) : <p>No documents match your filters.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="p-4 font-bold">Title</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Size</th>
                  <th className="p-4 font-bold">Uploaded</th>
                  <th className="p-4 font-bold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((document) => (
                  <tr key={document.id} className="border-b border-border transition-colors hover:bg-surface-elevated">
                    <td className="p-4">
                      <div className="font-medium text-text-primary">{document.title || document.original_filename || "Untitled"}</div>
                      {document.original_filename && document.title && <div className="mt-0.5 font-mono text-xs text-text-secondary">{document.original_filename}</div>}
                    </td>
                    <td className="p-4"><Badge variant="neutral" size="sm">{document.file_type || "—"}</Badge></td>
                    <td className="p-4 text-sm text-text-secondary">{formatSize(document.file_size)}</td>
                    <td className="p-4 text-sm text-text-secondary">{formatDate(document.created_at)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => void handleView(document)}><Eye size={14} /> View</Button>
                        {document.file_url && <a href={document.file_url} target="_blank" rel="noopener noreferrer" aria-label="Download document"><Button variant="ghost" size="sm"><Download size={14} /></Button></a>}
                        <button aria-label={`Delete ${document.title || document.original_filename || "document"}`} className="ghost-btn rounded-lg p-1.5 text-danger hover:bg-danger/20" onClick={() => void handleDelete(document)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="upload-document-title">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-surface-elevated p-6">
              <h2 id="upload-document-title" className="text-xl font-black tracking-tight text-text-primary">Upload Document</h2>
              <button aria-label="Close upload dialog" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary" onClick={() => setShowUpload(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4 p-6">
              <div><label className="text-xs font-bold uppercase tracking-widest text-text-secondary">File *</label><input type="file" className="input w-full" required onChange={(event) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} /></div>
              <div><label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Title</label><input className="input w-full" value={uploadForm.title} onChange={(event) => updateUploadField("title", event)} placeholder="Optional title" /></div>
              <div><label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Description</label><textarea className="input min-h-[80px] w-full" value={uploadForm.description} onChange={(event) => updateUploadField("description", event)} placeholder="Optional description" /></div>
              <div><label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Category</label><input className="input w-full" value={uploadForm.category} onChange={(event) => updateUploadField("category", event)} placeholder="e.g. Contract, Report" /></div>
              <div><label className="text-xs font-bold uppercase tracking-widest text-text-secondary">File Type</label><select className="input w-full" value={uploadForm.file_type} onChange={(event) => updateUploadField("file_type", event)}><option value="">Auto-detect</option>{FILE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
              <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button><Button type="submit" disabled={uploading}>{uploading ? "Uploading…" : "Upload"}</Button></div>
            </form>
          </div>
        </div>
      )}

      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="document-detail-title" onClick={() => setSelectedDoc(null)}>
          <aside className="w-full max-w-xl overflow-y-auto border-l border-border bg-surface shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-elevated p-6">
              <h2 id="document-detail-title" className="truncate text-xl font-black tracking-tight text-text-primary">{selectedDoc.title || selectedDoc.original_filename || "Document"}</h2>
              <button aria-label="Close document details" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-secondary hover:bg-surface-elevated hover:text-text-primary" onClick={() => setSelectedDoc(null)}><X size={16} /></button>
            </div>
            <div className="space-y-6 p-6">
              {detailLoading ? <div className="py-12 text-center text-text-secondary">Loading document…</div> : <>
                <div className="grid grid-cols-2 gap-4">
                  {[['Title', selectedDoc.title], ['Filename', selectedDoc.original_filename], ['Type', selectedDoc.file_type], ['Size', formatSize(selectedDoc.file_size)], ['Category', selectedDoc.category], ['Uploaded', formatDate(selectedDoc.created_at)]].map(([label, value]) => <div key={label}><p className="mb-1 text-xs font-bold uppercase tracking-widest text-text-secondary">{label}</p><p className="text-sm text-text-primary">{value || "—"}</p></div>)}
                </div>
                {selectedDoc.description && <div><p className="mb-1 text-xs font-bold uppercase tracking-widest text-text-secondary">Description</p><p className="text-sm text-text-primary">{selectedDoc.description}</p></div>}
                {selectedDoc.file_url && <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-text-secondary">Preview</p><div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">{isPdf(selectedDoc.file_type) || isPdf(selectedDoc.mime_type) ? <iframe src={selectedDoc.file_url} className="h-[400px] w-full" title="Document preview" /> : isImage(selectedDoc.file_type) || isImage(selectedDoc.mime_type) ? <img src={selectedDoc.file_url} alt={selectedDoc.title || selectedDoc.original_filename || "Document"} className="max-h-[400px] w-full object-contain" /> : <div className="p-8 text-center text-text-secondary"><p>Preview not available for this file type.</p><a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-accent underline"><ExternalLink size={14} /> Open file</a></div>}</div></div>}
                <div className="flex gap-3 pt-4">{selectedDoc.file_url && <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer" className="flex-1"><Button variant="primary" fullWidth><Download size={14} /> Download</Button></a>}<Button variant="ghost" fullWidth onClick={() => setSelectedDoc(null)}>Close</Button></div>
              </>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
