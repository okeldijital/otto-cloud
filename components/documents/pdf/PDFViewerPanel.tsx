"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import PDFError from "./PDFError";
import PDFLoading from "./PDFLoading";
import type { PdfErrorCode } from "./types";

const PDFViewer = dynamic(() => import("./PDFViewer"), {
  ssr: false,
  loading: () => <PDFLoading message="Starting viewer…" />,
});

interface Props {
  /** Contract id for signed download API. */
  contractId: string | number;
  documentId: string;
  title?: string;
  filename?: string;
  onClose: () => void;
}

/**
 * Loads a PDF via authenticated stream (Contract API → Document Platform signed URL proxy).
 * Never receives storage keys or bucket names.
 */
export default function PDFViewerPanel({
  contractId,
  documentId,
  title,
  filename,
  onClose,
}: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PdfErrorCode | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      const res = await api.get(
        `/contracts/${contractId}/documents/${documentId}/download?format=stream`,
        { responseType: "blob" }
      );

      const rawType = res.headers?.["content-type"];
      const contentType = typeof rawType === "string" ? rawType : "";
      // API may return JSON error as blob
      if (contentType.includes("application/json")) {
        const text = await (res.data as Blob).text();
        let code: PdfErrorCode = "unknown";
        try {
          const j = JSON.parse(text);
          if (j.code === "DOCUMENT_DELETED" || res.status === 410) code = "unavailable";
          else if (res.status === 401 || res.status === 403) code = "permission";
          else if (res.status === 404) code = "unavailable";
        } catch {
          /* ignore */
        }
        setError(code);
        return;
      }

      const blob = res.data as Blob;
      if (!blob || blob.size === 0) {
        setError("unavailable");
        return;
      }
      // Ensure PDF type for the viewer
      const pdfBlob =
        blob.type === "application/pdf"
          ? blob
          : new Blob([blob], { type: "application/pdf" });
      setBlobUrl(URL.createObjectURL(pdfBlob));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) setError("permission");
      else if (status === 404 || status === 410) setError("unavailable");
      else if (!err?.response) setError("network");
      else setError("unknown");
    } finally {
      setLoading(false);
    }
  }, [contractId, documentId, reloadToken]);

  useEffect(() => {
    void load();
    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [load]);

  const onDownload = async () => {
    // Prefer JSON signed URL flow used by repository download
    try {
      const res = await api.get(
        `/contracts/${contractId}/documents/${documentId}/download`
      );
      const url = res.data?.data?.url;
      const name = res.data?.data?.filename || filename || "document.pdf";
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.rel = "noopener";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
    } catch {
      /* fall through to blob */
    }
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || title || "document.pdf";
      a.click();
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden min-h-[520px]">
        <PDFLoading message="Fetching secure document…" />
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface overflow-hidden">
        <PDFError
          code={error || "unknown"}
          onRetry={() => setReloadToken((t) => t + 1)}
          onBack={onClose}
        />
      </div>
    );
  }

  return (
    <PDFViewer
      fileUrl={blobUrl}
      title={title || filename}
      filename={filename}
      onClose={onClose}
      onDownload={onDownload}
      fillContainer
    />
  );
}
