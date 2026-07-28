"use client";

import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import type { UploadQueueItem } from "./types";

interface Props {
  items: UploadQueueItem[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function UploadProgress({ items, onRetry, onCancel, onDismiss }: Props) {
  if (items.length === 0) return null;

  return (
    <div
      className="space-y-2"
      role="status"
      aria-live="polite"
      aria-label="Upload progress"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              {item.status === "uploading" || item.status === "queued" ? (
                <Loader2 size={14} className="animate-spin text-primary shrink-0" aria-hidden />
              ) : item.status === "success" ? (
                <CheckCircle2 size={14} className="text-success shrink-0" aria-hidden />
              ) : (
                <XCircle size={14} className="text-danger shrink-0" aria-hidden />
              )}
              <span className="truncate font-medium">{item.file.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs">
              {item.status === "uploading" && (
                <>
                  <span aria-label={`Upload progress ${item.progress} percent`}>
                    {item.progress}%
                  </span>
                  <button
                    type="button"
                    className="text-text-secondary hover:text-white underline"
                    onClick={() => onCancel(item.id)}
                  >
                    Cancel
                  </button>
                </>
              )}
              {item.status === "error" && (
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => onRetry(item.id)}
                >
                  Retry
                </button>
              )}
              {(item.status === "success" ||
                item.status === "error" ||
                item.status === "cancelled") && (
                <button
                  type="button"
                  className="p-1 text-text-secondary hover:text-white"
                  onClick={() => onDismiss(item.id)}
                  aria-label={`Dismiss ${item.file.name}`}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          {(item.status === "uploading" || item.status === "queued") && (
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}
          {item.error && (
            <p className="mt-1 text-xs text-danger">{item.error}</p>
          )}
          {item.status === "success" && (
            <p className="mt-1 text-xs text-success">Uploaded successfully.</p>
          )}
          {item.status === "cancelled" && (
            <p className="mt-1 text-xs text-text-secondary">Cancelled.</p>
          )}
        </div>
      ))}
    </div>
  );
}
