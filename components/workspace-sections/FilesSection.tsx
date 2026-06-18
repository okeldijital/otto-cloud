"use client";

import { useState, useEffect } from "react";
import { Upload, File, X, Download, FileText, Image, Music, Video } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

function fileIcon(type: string) {
  if (type.startsWith("image")) return <Image size={20} />;
  if (type.startsWith("audio")) return <Music size={20} />;
  if (type.startsWith("video")) return <Video size={20} />;
  return <FileText size={20} />;
}

export default function FilesSection({ workspace, workspaceId }: SectionProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setFiles(workspace.files || []); }, [workspace.files]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspace_id", String(workspaceId));
      await api.post("/workspace/files", formData, { headers: { "Content-Type": "multipart/form-data" } });
      // Refresh
    } catch { /* */ } finally { setUploading(false); }
  };

  const deleteFile = async (id: number) => {
    try { await api.delete(`/workspace/files?id=${id}`); } catch { /* */ }
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Files ({files.length})</h3>
        <label className="cursor-pointer">
          <Button variant="primary" size="sm" as="span"><Upload size={14} /> {uploading ? "Uploading..." : "Upload"}</Button>
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {files.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Upload size={32} className="mx-auto mb-2 text-text-secondary" />
            <p className="text-text-secondary text-sm">No files uploaded</p>
          </div>
        ) : files.map((f: any) => (
          <div key={f.id} className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex justify-between items-start mb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent">{fileIcon(f.file_type || "")}</div>
              <button onClick={() => deleteFile(f.id)} className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-red-400 transition-all"><X size={14} /></button>
            </div>
            <p className="text-xs text-white truncate">{f.name || f.filename}</p>
            <p className="text-[10px] text-text-secondary">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
