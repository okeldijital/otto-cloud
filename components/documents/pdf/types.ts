export type ZoomMode = "custom" | "fit-width" | "fit-page";

export type PdfErrorCode =
  | "unavailable"
  | "invalid"
  | "expired"
  | "network"
  | "permission"
  | "unknown";

export interface PdfSearchMatch {
  pageNumber: number;
  /** 0-based index among matches on that page (for UI). */
  indexOnPage: number;
}

export interface PdfViewerProps {
  /** Blob URL or same-origin stream URL for the PDF (never raw storage keys). */
  fileUrl: string;
  title?: string;
  /** Optional filename for download attribute. */
  filename?: string;
  onClose?: () => void;
  /**
   * Called when user requests download.
   * Parent should use signed download API — not the blob URL alone if preferred.
   */
  onDownload?: () => void | Promise<void>;
  className?: string;
  /** When true, fill the viewport (embedded full-panel). */
  fillContainer?: boolean;
}

export function friendlyPdfError(
  code: PdfErrorCode,
  fallback?: string
): string {
  switch (code) {
    case "permission":
      return "Permission denied. You cannot view this document.";
    case "expired":
      return "The document link expired. Retry to reload a fresh copy.";
    case "invalid":
      return "This file is not a valid PDF or is corrupted.";
    case "network":
      return "Network interruption while loading the document.";
    case "unavailable":
      return "Document unavailable. It may have been removed.";
    default:
      return fallback || "Unable to display this document.";
  }
}
