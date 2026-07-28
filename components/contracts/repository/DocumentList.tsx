"use client";

import DocumentRow from "./DocumentRow";
import type { RepositoryDocument } from "./types";

interface Props {
  items: RepositoryDocument[];
  actionBusyId?: string | null;
  onDownload: (item: RepositoryDocument) => void;
  onReplace: (item: RepositoryDocument) => void;
  onDelete: (item: RepositoryDocument) => void;
}

function SkeletonRow() {
  return (
    <div
      className="animate-pulse p-4 rounded-xl bg-white/5 space-y-3"
      aria-hidden
    >
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/10" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/10 rounded w-2/3" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function DocumentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading documents">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
      <span className="sr-only">Loading document list…</span>
    </div>
  );
}

export default function DocumentList({
  items,
  actionBusyId,
  onDownload,
  onReplace,
  onDelete,
}: Props) {
  return (
    <div className="space-y-2" role="list" aria-label="Document repository">
      {items.map((item) => (
        <div key={item.relationshipId} role="listitem">
          <DocumentRow
            item={item}
            actionBusyId={actionBusyId}
            onDownload={onDownload}
            onReplace={onReplace}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
}
