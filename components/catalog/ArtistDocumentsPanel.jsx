"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ArtistDocumentsPanel({ artistId }) {
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/artists/${artistId}/documents`);
      setItems(data?.items || []);
      setError("");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to load artist documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [artistId]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { data: upload } = await api.post("/storage/upload-url", {
        entityType: "artist",
        entityId: String(artistId),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        folder: "artist-documents",
      });

      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);

      await api.post("/storage/complete", {
        entityType: "artist",
        entityId: String(artistId),
        key: upload.key,
        fileName: upload.fileName,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
      });
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed to upload document.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await api.delete(`/storage/${id}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to delete document.");
    }
  };

  return (
    <Card title="Documents" subtitle="Documents attached directly to this artist">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-text-primary">Keep artist-specific records here.</p>
            <p className="text-xs text-text-secondary mt-1">IDs, proof of payment, advance documentation, tax documents, and other supporting files.</p>
          </div>
          <>
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <Button variant="primary" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading..." : "Add Document"}
            </Button>
          </>
        </div>

        {error && <div className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-sm text-text-secondary">{error}</div>}

        {loading ? (
          <div className="py-8 text-center text-text-secondary"><Loader2 className="mx-auto animate-spin" size={20} /></div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-border rounded-lg">
            <FileText className="mx-auto mb-2 text-text-secondary" size={24} />
            <p className="text-sm text-text-secondary">No documents attached to this artist yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/5 p-3">
                <div className="min-w-0 flex items-center gap-3">
                  <FileText size={18} className="shrink-0 text-text-secondary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-secondary">{item.category} · {formatSize(item.size)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <a href={item.downloadUrl} target="_blank" rel="noreferrer" className="p-2 rounded-md text-text-secondary hover:text-white hover:bg-white/10" title="Download">
                    <Download size={16} />
                  </a>
                  <button onClick={() => remove(item.id)} className="p-2 rounded-md text-text-secondary hover:text-danger hover:bg-danger/10" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
