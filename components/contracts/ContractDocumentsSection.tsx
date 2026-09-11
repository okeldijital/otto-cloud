"use client";

/**
 * Contract detail Documents tab — deterministic Core repository UI.
 * Source documents are stored and managed manually; no extraction workflow is presented.
 */
import { DocumentRepository } from "./repository";
export type { RepositoryDocument as ContractDocumentItem } from "./repository";

interface Props {
  contractId: string | number;
}

export default function ContractDocumentsSection({ contractId }: Props) {
  return <DocumentRepository contractId={contractId} />;
}
