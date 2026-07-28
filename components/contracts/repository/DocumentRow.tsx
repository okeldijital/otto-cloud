"use client";

import {
  Brain,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ExtractionStatusBadge from "@/components/contracts/intelligence/ExtractionStatusBadge";
import { formatFileSize } from "@/lib/storage/utils";
import { mimeLabel } from "./repositoryUtils";
import type { RepositoryDocument } from "./types";

interface Props {
  item: RepositoryDocument;
  actionBusyId?: string | null;
  extractionStatus?: string | null;
  extractionBusy?: boolean;
  onView: (item: RepositoryDocument) => void;
  onDownload: (item: RepositoryDocument) => void;
  onReplace: (item: RepositoryDocument) => void;
  onDelete: (item: RepositoryDocument) => void;
  onExtract?: (item: RepositoryDocument) => void;
  onOpenIntelligence?: (item: RepositoryDocument) => void;
}

export default function DocumentRow({
  item,
  actionBusyId,
  extractionStatus,
  extractionBusy,
  onView,
  onDownload,
  onReplace,
  onDelete,
  onExtract,
  onOpenIntelligence,
}: Props) {
  const d = item.document;
  const busy = actionBusyId === d.id;
  const isDeleted = d.status === "deleted";

  return (
    <article
      className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-colors border border-transparent hover:border-white/5"
      aria-label={`${d.originalFilename}, ${d.status}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div
          className="mt-0.5 shrink-0 w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center"
          aria-hidden
        >
          <FileText size={18} className="text-text-secondary" />
        </div>
        <div className="min-w-0 space-y-1">
          <button
            type="button"
            className="font-medium text-sm truncate text-left hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-inherit"
            title={d.originalFilename}
            onClick={() => !isDeleted && onView(item)}
            disabled={isDeleted}
          >
            {d.originalFilename}
          </button>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-text-secondary">
            <div>
              <dt className="sr-only">Type</dt>
              <dd>{mimeLabel(d.mimeType, d.extension)}</dd>
            </div>
            <div>
              <dt className="sr-only">Size</dt>
              <dd>{formatFileSize(d.fileSize)}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="sr-only">Uploaded</dt>
              <dd>
                <time dateTime={d.uploadedAt}>
                  {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : "—"}
                </time>
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="sr-only">Uploaded by</dt>
              <dd className="truncate">
                {d.uploadedByName ||
                  (d.uploadedBy != null ? `User #${d.uploadedBy}` : "—")}
              </dd>
            </div>
          </dl>
          <p className="text-[11px] text-text-secondary/70 font-mono truncate" title={d.checksum}>
            SHA-256: {d.checksum}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0 pl-12 lg:pl-0">
        <Badge variant={isDeleted ? "neutral" : "success"} size="sm">
          <span className="sr-only">Status: </span>
          {isDeleted ? "Deleted" : "Active"}
          <span
            className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
              isDeleted ? "bg-text-secondary" : "bg-success"
            }`}
            aria-hidden
          />
        </Badge>
        <ExtractionStatusBadge status={extractionStatus} />

        {busy || extractionBusy ? (
          <Loader2 size={16} className="animate-spin text-primary" aria-label="Working" />
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(item)}
              disabled={isDeleted}
              title={isDeleted ? "Cannot view deleted document" : "View PDF"}
              aria-label={`View ${d.originalFilename}`}
            >
              <Eye size={14} aria-hidden />
              <span className="hidden sm:inline">View</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(item)}
              disabled={isDeleted}
              title={isDeleted ? "Cannot download deleted document" : "Download"}
              aria-label={`Download ${d.originalFilename}`}
            >
              <Download size={14} aria-hidden />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReplace(item)}
              disabled={isDeleted}
              aria-label={`Replace ${d.originalFilename}`}
            >
              <RefreshCw size={14} aria-hidden />
              <span className="hidden sm:inline">Replace</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item)}
              disabled={isDeleted}
              aria-label={`Delete ${d.originalFilename}`}
            >
              <Trash2 size={14} aria-hidden />
              <span className="hidden sm:inline">Delete</span>
            </Button>
            {onExtract && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExtract(item)}
                disabled={isDeleted}
                aria-label={`Extract intelligence from ${d.originalFilename}`}
              >
                <Brain size={14} aria-hidden />
                <span className="hidden sm:inline">Extract</span>
              </Button>
            )}
            {onOpenIntelligence && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenIntelligence(item)}
                disabled={isDeleted}
                aria-label={`Open intelligence workspace for ${d.originalFilename}`}
              >
                <span className="text-xs">AI draft</span>
              </Button>
            )}
          </>
        )}
        <span className="sr-only">
          <MoreHorizontal /> Actions for {d.originalFilename}
        </span>
      </div>
    </article>
  );
}
