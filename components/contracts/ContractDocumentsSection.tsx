"use client";

/**
 * Contract detail Documents tab — Milestone 2.2 Repository UI.
 * Adds an explicit workflow handoff when extraction is ready for human review.
 */
import ExtractionReviewHandoff from "./repository/ExtractionReviewHandoff";
import { DocumentRepository } from "./repository";
export type { RepositoryDocument as ContractDocumentItem } from "./repository";

interface Props {
  contractId: string | number;
}

export default function ContractDocumentsSection({ contractId }: Props) {
  return (
    <div className="space-y-5">
      <ExtractionReviewHandoff contractId={contractId} />
      <DocumentRepository contractId={contractId} />
    </div>
  );
}
