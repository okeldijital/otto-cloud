"use client";

import { FileText } from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  onUpload: () => void;
  filtered?: boolean;
}

export default function RepositoryEmptyState({ onUpload, filtered }: Props) {
  if (filtered) {
    return (
      <div className="rounded-2xl bg-white/5 px-6 py-12 text-center" role="status">
        <FileText size={28} className="mx-auto mb-3 text-text-secondary" aria-hidden />
        <p className="font-medium">No documents match your filters.</p>
        <p className="text-sm text-text-secondary mt-1">
          Try adjusting filename, type, status, or date range.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 px-6 py-12 text-center" role="status">
      <FileText size={28} className="mx-auto mb-3 text-text-secondary" aria-hidden />
      <p className="font-medium">No signed agreements have been uploaded.</p>
      <p className="text-sm text-text-secondary mt-1 max-w-md mx-auto">
        Upload immutable PDF agreements to build a professional legal repository for this
        contract.
      </p>
      <div className="mt-5">
        <Button variant="primary" onClick={onUpload}>
          Upload Agreement
        </Button>
      </div>
    </div>
  );
}
