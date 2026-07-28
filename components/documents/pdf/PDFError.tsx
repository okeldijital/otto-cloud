"use client";

import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import { friendlyPdfError, type PdfErrorCode } from "./types";

interface Props {
  code?: PdfErrorCode;
  message?: string;
  onRetry?: () => void;
  onBack?: () => void;
}

export default function PDFError({
  code = "unknown",
  message,
  onRetry,
  onBack,
}: Props) {
  const text = message || friendlyPdfError(code);

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center text-danger">
        <AlertTriangle size={24} aria-hidden />
      </div>
      <div>
        <p className="font-medium text-text-primary">Unable to open PDF</p>
        <p className="text-sm text-text-secondary mt-1 max-w-md">{text}</p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
        {onBack && (
          <Button variant="secondary" size="sm" onClick={onBack}>
            Return to repository
          </Button>
        )}
      </div>
    </div>
  );
}
