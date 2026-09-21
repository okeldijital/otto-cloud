"use client";

import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import EntityArtwork from "@/components/media/EntityArtwork";
import { invalidateEntityArtwork } from "@/hooks/useAttachment";
import { optimizeImage } from "@/lib/media/image-optimization";
import api from "@/lib/api";

export async function uploadEntityProfileImage(
  entityType: "label" | "publisher" | "pro",
  entityId: string | number,
  file: File
) {
  const optimized = await optimizeImage(file, "avatar");
  const uploadResponse = await api.post("/storage/upload-url", {
    entityType, entityId: String(entityId), fileName: optimized.name,
    mimeType: optimized.type, fileSize: optimized.size, folder: entityType, uploadPurpose: "artwork",
  });
  const upload = uploadResponse.data;
  const r2Response = await fetch(upload.uploadUrl, {
    method: "PUT", headers: { "Content-Type": optimized.type }, body: optimized,
  });
  if (!r2Response.ok) throw new Error("Image upload failed (" + r2Response.status + ")");
  await api.post("/storage/complete", {
    entityType, entityId: String(entityId), key: upload.key, fileName: upload.fileName,
    originalName: file.name, mimeType: optimized.type, fileSize: optimized.size, uploadPurpose: "artwork",
  });
  invalidateEntityArtwork(entityType, entityId);
}

type Props = {
  entityType: "label" | "publisher" | "pro";
  entityId: string | number;
  name: string;
  onUploaded?: () => void;
};

export default function EntityProfileImageField({ entityType, entityId, name, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      await uploadEntityProfileImage(entityType, entityId, file);
      onUploaded?.();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.message || "Failed to upload profile image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <EntityArtwork entityType={entityType} entityId={entityId} alt={name} placeholder="label" size={88} className="shrink-0 rounded-xl border border-border" />
      <div className="min-w-0">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          {uploading ? "Uploading..." : "Upload profile image"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { void handleChange(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        </label>
        <p className="mt-1.5 text-xs text-text-secondary">JPEG, PNG or WebP. Otto optimizes profile images to WebP.</p>
      </div>
    </div>
  );
}
