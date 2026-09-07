"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, FileCheck2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props {
  contractId: string | number;
}

type ReviewItem = {
  documentId: string;
  filename: string;
  extractionId: string;
};

/**
 * Explicit handoff from completed document extraction into human verification.
 * The backend extraction state remains machine-readable; this component makes
 * the next human action visible and actionable.
 */
export default function ExtractionReviewHandoff({ contractId }: Props) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const docsRes = await api.get(
        `/contracts/${contractId}/documents?includeDeleted=false`
      );
      const docs = docsRes.data?.data?.items ?? docsRes.data?.items ?? [];
      const activeDocs = Array.isArray(docs)
        ? docs.filter((d: any) => d?.document?.status === "active")
        : [];

      const results = await Promise.all(
        activeDocs.map(async (item: any) => {
          try {
            const res = await api.get(
              `/contracts/${contractId}/documents/${item.document.id}/extractions`
            );
            const data = res.data?.data;
            if (data?.extractionStatus !== "awaiting_verification" || !data?.extractionId) {
              return null;
            }
            return {
              documentId: item.document.id,
              filename: item.document.originalFilename,
              extractionId: data.extractionId,
            } satisfies ReviewItem;
          } catch {
            return null;
          }
        })
      );

      setItems(results.filter(Boolean) as ReviewItem[]);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  if (loading || items.length === 0) return null;

  return (
    <Card>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 w-10 h-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <FileCheck2 size={20} className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Next step · Human verification
            </p>
            <h3 className="text-base font-semibold text-white mt-1">
              The document has been extracted and is ready for review.
            </h3>
            <p className="text-sm text-text-secondary mt-1 max-w-2xl">
              Review the extracted fields against the signed PDF, correct or reject
              anything inaccurate, then complete verification. Only after verification
              can OTTO use the contract for relationship discovery and downstream work.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 shrink-0 lg:min-w-[230px]">
          {items.map((item) => (
            <Button
              key={item.documentId}
              variant="primary"
              onClick={() => {
                window.location.href =
                  `/contracts/${contractId}/verification?document_id=${encodeURIComponent(item.documentId)}&extraction_id=${encodeURIComponent(item.extractionId)}`;
              }}
            >
              <CheckCircle2 size={14} />
              Review {item.filename}
              <ArrowRight size={14} />
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 grid gap-3 sm:grid-cols-3 text-xs">
        <div className="text-text-secondary">
          <span className="text-success">1.</span> Extraction complete
        </div>
        <div className="text-text-secondary">
          <span className="text-primary">2.</span> Human review required
        </div>
        <div className="text-text-secondary">
          <span className="text-text-secondary">3.</span> Verify → Discover relationships
        </div>
      </div>
    </Card>
  );
}
