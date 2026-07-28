"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { RepositoryDocument } from "./types";

interface Props {
  document: RepositoryDocument | null;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteDialog({ document, onConfirm, onCancel }: Props) {
  return (
    <ConfirmDialog
      isOpen={!!document}
      title="Remove document"
      message={
        document
          ? `Soft-delete “${document.document.originalFilename}”? The immutable original remains in storage per retention policy and will no longer appear as active in this repository.`
          : ""
      }
      confirmLabel="Delete"
      confirmVariant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
