"use client";

import { useRef } from "react";
import { X, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import type { RepositoryDocument, UploadQueueItem } from "./types";
import UploadProgress from "./UploadProgress";

interface Props {
  document: RepositoryDocument | null;
  queue: UploadQueueItem[];
  busy: boolean;
  onClose: () => void;
  onFile: (file: File) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function ReplaceDialog({
  document,
  queue,
  busy,
  onClose,
  onFile,
  onRetry,
  onCancel,
  onDismiss,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (!document) return null;

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="replace-dialog-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-lg p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="replace-dialog-title" className="text-lg font-semibold flex items-center gap-2">
              <RefreshCw size={18} aria-hidden /> Replace document
            </h2>
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">
              Upload a new PDF for this agreement. A new immutable document record will be
              created and linked. The previous version{" "}
              <strong className="text-text-primary">remains preserved</strong> in the
              repository.
            </p>
            <p className="text-xs text-text-secondary mt-2 font-mono truncate">
              Current: {document.document.originalFilename}
            </p>
          </div>
          <button
            type="button"
            className="p-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5"
            onClick={onClose}
            aria-label="Close replace dialog"
            disabled={busy}
          >
            <X size={18} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />

        <Button
          variant="primary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          fullWidth
        >
          Choose replacement PDF
        </Button>

        <UploadProgress
          items={queue}
          onRetry={onRetry}
          onCancel={onCancel}
          onDismiss={onDismiss}
        />

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {busy ? "Uploading…" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}
