"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import api from "@/lib/api";
import PDFViewerPanel from "@/components/documents/pdf/PDFViewerPanel";

interface ContractDocumentPreviewProps {
  contractId: string | number;
}

interface ContractDocument {
  id: string | number;
  originalFilename?: string;
  original_filename?: string;
  file_name?: string;
  name?: string;
  status?: string;
  mimeType?: string;
  mime_type?: string;
}

export default function ArtistContractDocumentPreview({
  contractId,
}: ContractDocumentPreviewProps) {
  const [documents, setDocuments] = useState<ContractDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(
          `/contracts/${contractId}/documents?includeDeleted=false`
        );
        const items = res.data?.data?.items ?? res.data?.items ?? [];
        const activeItems = Array.isArray(items)
          ? items.filter((item: ContractDocument) => item.status !== "deleted")
          : [];

        if (!active) return;
        setDocuments(activeItems);
        setSelectedId(activeItems[0]?.document?.id ?? activeItems[0]?.id ?? null);
      } catch (err: any) {
        if (!active) return;
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Unable to load the contract document."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [contractId]);

  const normalizedDocuments = documents.map((item: any) => ({
    ...item,
    id: item.document?.id ?? item.id,
    filename:
      item.document?.originalFilename ??
      item.originalFilename ??
      item.original_filename ??
      item.file_name ??
      item.name ??
      "Contract document.pdf",
  }));

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-text-secondary">
        Loading contract document…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-5 text-sm text-danger">
        {error}
      </div>
    );
  }

  if (!normalizedDocuments.length) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-text-secondary">
        No PDF is attached to this contract.
      </div>
    );
  }

  const selected =
    normalizedDocuments.find((item) => String(item.id) === String(selectedId)) ??
    normalizedDocuments[0];

  return (
    <div className="space-y-3">
      {normalizedDocuments.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {normalizedDocuments.map((item) => (
            <button
              key={String(item.id)}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                String(item.id) === String(selected.id)
                  ? "border-primary/50 bg-primary/10 text-text-accent"
                  : "border-border text-text-secondary hover:bg-surface-elevated hover:text-text-accent"
              }`}
            >
              <FileText size={14} className="shrink-0" />
              <span className="truncate">{item.filename}</span>
            </button>
          ))}
        </div>
      )}

      {selectedId !== null ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <PDFViewerPanel
            contractId={contractId}
            documentId={String(selected.id)}
            title={selected.filename}
            filename={selected.filename}
            onClose={() => setSelectedId(null)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setSelectedId(selected.id)}
          className="text-xs text-primary hover:underline"
        >
          Reopen PDF
        </button>
      )}

      <p className="flex items-center gap-1.5 text-xs text-text-secondary">
        <span>Need to manage this agreement, its relationships, or documents?</span>
        <a
          href={`/contracts/${contractId}`}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Open contract workflow
          <ExternalLink size={12} />
        </a>
      </p>
    </div>
  );
}
