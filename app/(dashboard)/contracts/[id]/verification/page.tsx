"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Canonical verification entry point.
 *
 * There is one human-verification workspace: the Document Intelligence page,
 * which keeps the original PDF inline beside AI draft fields and the verified
 * layer. This route remains as a compatibility entry point for existing links
 * and redirects into that canonical workspace.
 */
export default function ContractVerificationPage() {
  const { id: contractId } = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const documentId = search.get("document_id");

  useEffect(() => {
    if (!contractId || !documentId) return;

    router.replace(
      `/contracts/${encodeURIComponent(contractId)}/intelligence/${encodeURIComponent(documentId)}`
    );
  }, [contractId, documentId, router]);

  return (
    <div className="p-12 text-center text-text-secondary flex flex-col items-center gap-3">
      <Loader2 className="animate-spin" size={20} />
      Opening verification workspace…
    </div>
  );
}
