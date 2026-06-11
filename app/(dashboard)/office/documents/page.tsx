// @ts-nocheck
"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Plus, ExternalLink, Download, Trash2, Eye, X } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  return (kb / 1024).toFixed(1) + " MB";
}

const FILE_TYPES = ["pdf", "docx", "xlsx", "image", "audio", "video", "other"];

export default function OfficeDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ file: null, title: "", description: "", category: "", file_type: "" });

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/office/documents");
      setDocuments(Array.isArray(res.data) ? res.data : res.data?.items || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return documents.filter((d) => {
      const name = (d.title || d.original_filename || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || (d.original_filename || "").toLowerCase().includes(q);
      const matchesType = typeFilter === "All" || (d.file_type || "").toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [documents, search, typeFilter]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadForm.file);
      if (uploadForm.title) fd.append("title", uploadForm.title);
      if (uploadForm.description) fd.append("description", uploadForm.description);
      if (uploadForm.category) fd.append("category", uploadForm.category);
      if (uploadForm.file_type) fd.append("file_type", uploadForm.file_type);
      await api.post("/office/documents?action=upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setShowUpload(false);
      setUploadForm({ file: null, title: "", description: "", category: "", file_type: "" });
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.title || doc.original_filename}"?`)) return;
    try {
      await api.delete(`/office/documents?id=${doc.id}`);
      if (selectedDoc?.id === doc.id) setSelectedDoc(null);
      fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const handleView = async (doc) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/office/documents?id=${doc.id}`);
      setSelectedDoc(res.data?.item || res.data);
    } catch (err) { alert("Failed to load document details"); }
    finally { setDetailLoading(false); }
  };

  const isImage = (type) => ["image", "png", "jpg", "jpeg", "gif", "webp"].includes((type || "").toLowerCase());
  const isPdf = (type) => ["pdf", "application/pdf"].includes((type || "").toLowerCase());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="Upload and manage office documents, files, and assets."
        actions={
          <Button variant="orange" size="sm" onClick={() => setShowUpload(true)}>
            <Plus size={16} /> Upload Document
          </Button>
        }
      />

      <Card noPadding>
        <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="All">Type: All</option>
              {FILE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Search size={16} className="text-text-secondary" />
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading documents…</div>
        ) : error ? (
          <div className="p-12 text-center text-danger">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            {documents.length === 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">No documents yet</h3>
                <p className="text-sm">Upload your first document to get started.</p>
                <Button variant="orange" size="sm" onClick={() => setShowUpload(true)}>
                  <Plus size={16} /> Upload Document
                </Button>
              </div>
            ) : (
              <p>No documents match your filters.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">Title</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Size</th>
                  <th className="p-4 font-bold">Uploaded</th>
                  <th className="p-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{doc.title || doc.original_filename || "Untitled"}</div>
                      {doc.original_filename && doc.title && (
                        <div className="text-xs text-text-secondary font-mono mt-0.5">{doc.original_filename}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="neutral" size="sm">{doc.file_type || "—"}</Badge>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">{formatSize(doc.file_size)}</td>
                    <td className="p-4 text-sm text-text-secondary">{formatDate(doc.created_at)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleView(doc)}><Eye size={14} /> View</Button>
                        {doc.file_url && (
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm"><Download size={14} /></Button>
                          </a>
                        )}
                        <button className="ghost-btn p-1.5 hover:bg-danger/20 rounded-lg text-danger" onClick={() => handleDelete(doc)}>
                          <Trash2 size={14} />
                        </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 sm:p-6">
          <div className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-xl font-black text-white tracking-tight">Upload Document</h2>
              <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white" onClick={() => setShowUpload(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">File *</label>
                <input type="file" className="input w-full" required onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })} />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Title</label>
                <input className="input w-full" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Optional title" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Description</label>
                <textarea className="input w-full min-h-[80px]" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Category</label>
                <input className="input w-full" value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })} placeholder="e.g. Contract, Report" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">File Type</label>
                <select className="input w-full" value={uploadForm.file_type} onChange={(e) => setUploadForm({ ...uploadForm, file_type: e.target.value })}>
                  <option value="">Auto-detect</option>
                  {FILE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
                <Button type="submit" disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0f1115]/60 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}>
          <div className="w-full max-w-xl bg-premium-glass border-l border-white/10 shadow-glass overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02] sticky top-0 z-10">
              <h2 className="text-xl font-black text-white tracking-tight truncate">{selectedDoc.title || selectedDoc.original_filename}</h2>
              <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white" onClick={() => setSelectedDoc(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Title</p>
                  <p className="text-sm text-white">{selectedDoc.title || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Filename</p>
                  <p className="text-sm text-white font-mono">{selectedDoc.original_filename || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Type</p>
                  <p className="text-sm text-white">{selectedDoc.file_type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Size</p>
                  <p className="text-sm text-white">{formatSize(selectedDoc.file_size)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Category</p>
                  <p className="text-sm text-white">{selectedDoc.category || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Uploaded</p>
                  <p className="text-sm text-white">{formatDate(selectedDoc.created_at)}</p>
                </div>
              </div>
              {selectedDoc.description && (
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Description</p>
                  <p className="text-sm text-white">{selectedDoc.description}</p>
                </div>
              )}
              {selectedDoc.file_url && (
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Preview</p>
                  <div className="bg-white/5 rounded-xl overflow-hidden border border-white/5">
                    {isPdf(selectedDoc.file_type) || isPdf(selectedDoc.mime_type) ? (
                      <iframe src={selectedDoc.file_url} className="w-full h-[400px]" title="Document preview" />
                    ) : isImage(selectedDoc.file_type) || isImage(selectedDoc.mime_type) ? (
                      <img src={selectedDoc.file_url} alt={selectedDoc.title} className="w-full max-h-[400px] object-contain" />
                    ) : (
                      <div className="p-8 text-center text-text-secondary">
                        <p>Preview not available for this file type.</p>
                        <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer" className="text-accent underline mt-2 inline-block">
                          <ExternalLink size={14} className="inline mr-1" />Open file
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                {selectedDoc.file_url && (
                  <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button variant="primary" fullWidth><Download size={14} /> Download</Button>
                  </a>
                )}
                <Button variant="ghost" onClick={() => setSelectedDoc(null)} fullWidth>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
