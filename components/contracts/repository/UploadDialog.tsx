"use client";

import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import UploadDropzone from "./UploadDropzone";
import UploadProgress from "./UploadProgress";
import type { UploadQueueItem } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  queue: UploadQueueItem[];
  busy: boolean;
  onFiles: (files: File[]) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
  title?: string;
  description?: string;
}

export default function UploadDialog({
  open,
  onClose,
  queue,
  busy,
  onFiles,
  onRetry,
  onCancel,
  onDismiss,
  title = "Upload Agreement",
  description = "Upload a signed PDF. Documents are stored immutably.",
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-dialog-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="upload-dialog-title" className="text-lg font-semibold text-text-primary">
              {title}
            </h2>
            <p className="text-sm text-text-secondary mt-1">{description}</p>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5"
            onClick={onClose}
            aria-label="Close upload dialog"
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>

        <UploadDropzone busy={busy} onFiles={onFiles} />
        <UploadProgress
          items={queue}
          onRetry={onRetry}
          onCancel={onCancel}
          onDismiss={onDismiss}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {busy ? "Uploading…" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  );
}
