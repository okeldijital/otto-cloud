"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import PDFError from "./PDFError";
import PDFFullscreen from "./PDFFullscreen";
import PDFLoading from "./PDFLoading";
import PDFToolbar from "./PDFToolbar";
import type { PdfErrorCode, PdfSearchMatch, PdfViewerProps, ZoomMode } from "./types";

// PDF.js worker (CDN). Viewer never contacts R2 — only blob/same-origin URLs.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;

function mapLoadError(err: unknown): PdfErrorCode {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes("password") || msg.includes("permission") || msg.includes("403")) {
    return "permission";
  }
  if (msg.includes("invalid") || msg.includes("corrupt") || msg.includes("format")) {
    return "invalid";
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "network";
  }
  if (msg.includes("expired") || msg.includes("404")) {
    return "unavailable";
  }
  return "unknown";
}

/**
 * Reusable PDF viewer — presentation only.
 * Consumes a same-origin or blob file URL; never talks to R2/storage.
 */
export default function PDFViewer({
  fileUrl,
  title,
  filename,
  onClose,
  onDownload,
  className = "",
  fillContainer = true,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageWrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("custom");
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageRendering, setPageRendering] = useState(false);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<PdfErrorCode | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(720);

  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<PdfSearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [searchBusy, setSearchBusy] = useState(false);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  // Measure container for fit-width / fit-page
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setContainerWidth(w - 32);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyFit = useCallback(
    (mode: ZoomMode) => {
      setZoomMode(mode);
      // Scale applied via Page width prop when fit-width; fit-page uses height heuristic.
      if (mode === "fit-width") {
        setScale(1); // width prop drives size
      } else if (mode === "fit-page") {
        // Approximate fit: slightly smaller than width so page fits typical viewport height.
        setScale(Math.min(1, (containerWidth * 0.9) / Math.max(containerWidth, 1)));
      }
    },
    [containerWidth]
  );

  const onDocumentLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      setNumPages(pdf.numPages);
      setPageNumber(1);
      setLoading(false);
      setErrorCode(null);
      setLoadProgress(100);
      pdfDocRef.current = pdf;
      // Announce for screen readers
      const live = document.getElementById("pdf-viewer-live");
      if (live) live.textContent = `Document loaded. ${pdf.numPages} pages.`;
    },
    []
  );

  const onDocumentLoadError = useCallback((err: Error) => {
    setLoading(false);
    setErrorCode(mapLoadError(err));
    pdfDocRef.current = null;
  }, []);

  const goToPage = (page: number) => {
    if (numPages < 1) return;
    const next = Math.min(numPages, Math.max(1, page));
    setPageNumber(next);
    const live = document.getElementById("pdf-viewer-live");
    if (live) live.textContent = `Page ${next} of ${numPages}`;
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const zoomIn = () => {
    setZoomMode("custom");
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  };
  const zoomOut = () => {
    setZoomMode("custom");
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  };

  const runSearch = async () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !pdfDocRef.current) {
      setMatches([]);
      setActiveMatchIndex(0);
      return;
    }
    setSearchBusy(true);
    try {
      const doc = pdfDocRef.current;
      const found: PdfSearchMatch[] = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const text = content.items
          .map((it) => ("str" in it ? String((it as { str: string }).str) : ""))
          .join(" ")
          .toLowerCase();
        let from = 0;
        let idxOnPage = 0;
        while (true) {
          const at = text.indexOf(q, from);
          if (at === -1) break;
          found.push({ pageNumber: p, indexOnPage: idxOnPage });
          idxOnPage += 1;
          from = at + q.length;
        }
      }
      setMatches(found);
      setActiveMatchIndex(0);
      if (found.length > 0) {
        goToPage(found[0].pageNumber);
      }
      const live = document.getElementById("pdf-viewer-live");
      if (live) {
        live.textContent =
          found.length === 0
            ? "No search results"
            : `${found.length} search results found`;
      }
    } finally {
      setSearchBusy(false);
    }
  };

  const goMatch = (delta: number) => {
    if (matches.length === 0) return;
    const next =
      (activeMatchIndex + delta + matches.length * 10) % matches.length;
    setActiveMatchIndex(next);
    goToPage(matches[next].pageNumber);
  };

  const handlePrint = () => {
    // Browser print of current blob/same-origin stream URL
    const w = window.open(fileUrl, "_blank", "noopener,noreferrer");
    if (w) {
      w.addEventListener("load", () => {
        try {
          w.focus();
          w.print();
        } catch {
          // User can print from the opened tab
        }
      });
      // Fallback timer if load already fired
      setTimeout(() => {
        try {
          w.print();
        } catch {
          /* ignore */
        }
      }, 800);
    } else {
      // Popup blocked — print via hidden iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.src = fileUrl;
      iframe.title = "Print PDF";
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => iframe.remove(), 1000);
        }
      };
    }
  };

  const handleDownload = async () => {
    if (onDownload) {
      await onDownload();
      return;
    }
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = filename || title || "document.pdf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goToPage(pageNumber + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goToPage(pageNumber - 1);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        zoomOut();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, numPages, isFullscreen]);

  const pageWidth =
    zoomMode === "fit-width"
      ? Math.max(280, containerWidth)
      : undefined;

  const pageScale = zoomMode === "fit-width" ? 1 : scale;

  const shellStyle: CSSProperties = fillContainer
    ? { minHeight: isFullscreen ? "100vh" : 520, height: isFullscreen ? "100vh" : "min(75vh, 900px)" }
    : { minHeight: 420 };

  if (errorCode) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-surface overflow-hidden ${className}`}>
        <PDFError
          code={errorCode}
          onRetry={() => {
            setErrorCode(null);
            setLoading(true);
            setReloadKey((k) => k + 1);
          }}
          onBack={onClose}
        />
      </div>
    );
  }

  return (
    <PDFFullscreen
      active={isFullscreen}
      onChange={setIsFullscreen}
      className={`flex flex-col rounded-2xl border border-white/10 bg-surface overflow-hidden ${
        isFullscreen ? "rounded-none border-0 bg-black" : ""
      } ${className}`}
    >
      <div ref={containerRef} className="flex flex-col flex-1 min-h-0" style={shellStyle}>
        <PDFToolbar
          title={title}
          pageNumber={pageNumber}
          numPages={numPages}
          scale={zoomMode === "fit-width" ? containerWidth / 612 : scale}
          zoomMode={zoomMode}
          rotation={rotation}
          isFullscreen={isFullscreen}
          disabled={loading && !numPages}
          searchQuery={searchQuery}
          matchCount={matches.length}
          activeMatchIndex={activeMatchIndex}
          searchBusy={searchBusy}
          onPageChange={goToPage}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitWidth={() => applyFit("fit-width")}
          onFitPage={() => applyFit("fit-page")}
          onRotateLeft={() => setRotation((r) => (r + 270) % 360)}
          onRotateRight={() => setRotation((r) => (r + 90) % 360)}
          onPrint={handlePrint}
          onDownload={() => void handleDownload()}
          onToggleFullscreen={() => setIsFullscreen((v) => !v)}
          onClose={onClose}
          onSearchQueryChange={setSearchQuery}
          onSearch={() => void runSearch()}
          onSearchNext={() => goMatch(1)}
          onSearchPrev={() => goMatch(-1)}
          onSearchClear={() => {
            setSearchQuery("");
            setMatches([]);
            setActiveMatchIndex(0);
          }}
        />

        <div
          ref={scrollRef}
          className="flex-1 overflow-auto bg-black/40 relative"
          tabIndex={0}
          aria-label="PDF page canvas"
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80">
              <PDFLoading
                message="Document loading…"
                progress={loadProgress}
              />
            </div>
          )}
          {pageRendering && !loading && (
            <div className="absolute top-2 right-2 z-10 text-xs text-text-secondary bg-black/50 px-2 py-1 rounded">
              Rendering page…
            </div>
          )}

          <div
            ref={pageWrapRef}
            className="flex justify-center p-4 min-h-full"
          >
            <Document
              key={`${fileUrl}-${reloadKey}`}
              file={fileUrl}
              loading={null}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              onLoadProgress={({ loaded, total }) => {
                if (total > 0) setLoadProgress((loaded / total) * 100);
              }}
              error={null}
              className="pdf-document"
            >
              <Page
                pageNumber={pageNumber}
                scale={pageScale}
                width={pageWidth}
                rotate={rotation}
                loading={
                  <div className="w-[min(100%,612px)] h-[400px] flex items-center justify-center">
                    <PDFLoading message="Rendering page…" />
                  </div>
                }
                onRenderSuccess={() => setPageRendering(false)}
                onRenderError={() => setPageRendering(false)}
                onLoadSuccess={() => setPageRendering(true)}
                renderTextLayer
                renderAnnotationLayer
                className="shadow-xl bg-white"
              />
            </Document>
          </div>
        </div>

        <div id="pdf-viewer-live" className="sr-only" aria-live="polite" />
      </div>
    </PDFFullscreen>
  );
}
