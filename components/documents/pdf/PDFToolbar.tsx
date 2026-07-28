"use client";

import type { ReactNode } from "react";
import {
  Download,
  Maximize2,
  Minimize2,
  Printer,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import PDFNavigation from "./PDFNavigation";
import PDFSearch from "./PDFSearch";
import type { ZoomMode } from "./types";

interface Props {
  title?: string;
  pageNumber: number;
  numPages: number;
  scale: number;
  zoomMode: ZoomMode;
  rotation: number;
  isFullscreen: boolean;
  disabled?: boolean;
  searchQuery: string;
  matchCount: number;
  activeMatchIndex: number;
  searchBusy?: boolean;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onToggleFullscreen: () => void;
  onClose?: () => void;
  onSearchQueryChange: (q: string) => void;
  onSearch: () => void;
  onSearchNext: () => void;
  onSearchPrev: () => void;
  onSearchClear: () => void;
}

function ToolBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-text-secondary hover:text-white"
    >
      {children}
    </button>
  );
}

export default function PDFToolbar(props: Props) {
  const {
    title,
    pageNumber,
    numPages,
    scale,
    disabled,
    isFullscreen,
    searchQuery,
    matchCount,
    activeMatchIndex,
    searchBusy,
    onPageChange,
    onZoomIn,
    onZoomOut,
    onFitWidth,
    onFitPage,
    onRotateLeft,
    onRotateRight,
    onPrint,
    onDownload,
    onToggleFullscreen,
    onClose,
    onSearchQueryChange,
    onSearch,
    onSearchNext,
    onSearchPrev,
    onSearchClear,
  } = props;

  return (
    <div
      className="flex flex-col gap-2 border-b border-white/10 bg-surface/95 backdrop-blur px-2 sm:px-3 py-2"
      role="toolbar"
      aria-label="PDF viewer toolbar"
    >
      <div className="flex flex-wrap items-center gap-1 sm:gap-2 justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onClose && (
            <ToolBtn label="Close viewer" onClick={onClose}>
              <X size={16} />
            </ToolBtn>
          )}
          {title && (
            <h2 className="text-sm font-medium truncate max-w-[40vw] sm:max-w-xs text-text-primary">
              {title}
            </h2>
          )}
        </div>

        <PDFNavigation
          pageNumber={pageNumber}
          numPages={numPages}
          onPageChange={onPageChange}
          disabled={disabled}
        />

        <div className="flex flex-wrap items-center gap-0.5">
          <ToolBtn label="Zoom out" onClick={onZoomOut} disabled={disabled}>
            <ZoomOut size={16} />
          </ToolBtn>
          <span className="text-xs tabular-nums text-text-secondary w-12 text-center" aria-live="polite">
            {Math.round(scale * 100)}%
          </span>
          <ToolBtn label="Zoom in" onClick={onZoomIn} disabled={disabled}>
            <ZoomIn size={16} />
          </ToolBtn>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded-lg hover:bg-white/10 text-text-secondary disabled:opacity-40"
            onClick={onFitWidth}
            disabled={disabled}
            title="Fit width"
          >
            Fit width
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs rounded-lg hover:bg-white/10 text-text-secondary disabled:opacity-40 hidden sm:inline"
            onClick={onFitPage}
            disabled={disabled}
            title="Fit page"
          >
            Fit page
          </button>
          <ToolBtn label="Rotate left" onClick={onRotateLeft} disabled={disabled}>
            <RotateCcw size={16} />
          </ToolBtn>
          <ToolBtn label="Rotate right" onClick={onRotateRight} disabled={disabled}>
            <RotateCw size={16} />
          </ToolBtn>
          <ToolBtn label="Print" onClick={onPrint} disabled={disabled}>
            <Printer size={16} />
          </ToolBtn>
          <ToolBtn label="Download" onClick={onDownload} disabled={disabled}>
            <Download size={16} />
          </ToolBtn>
          <ToolBtn
            label={isFullscreen ? "Exit full screen" : "Full screen"}
            onClick={onToggleFullscreen}
            disabled={disabled}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </ToolBtn>
        </div>
      </div>

      <div className="flex justify-end sm:justify-start">
        <PDFSearch
          query={searchQuery}
          onQueryChange={onSearchQueryChange}
          onSearch={onSearch}
          onNext={onSearchNext}
          onPrev={onSearchPrev}
          onClear={onSearchClear}
          matchCount={matchCount}
          activeIndex={activeMatchIndex}
          busy={searchBusy || disabled}
        />
      </div>
    </div>
  );
}
