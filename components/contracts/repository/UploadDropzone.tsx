"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  disabled?: boolean;
  busy?: boolean;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export default function UploadDropzone({
  disabled,
  busy,
  onFiles,
  compact,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const acceptFiles = (list: FileList | null) => {
    if (!list?.length) return;
    onFiles(Array.from(list));
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload agreement. Drag and drop PDF files or press Enter to browse."
      aria-disabled={disabled || busy}
      className={`border-2 border-dashed rounded-2xl text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        compact ? "p-4" : "p-8"
      } ${
        dragActive
          ? "border-primary bg-primary/5"
          : "border-white/10 hover:border-white/20"
      } ${disabled || busy ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (!disabled && !busy) acceptFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled && !busy) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        disabled={disabled || busy}
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {busy ? (
        <>
          <Loader2
            size={compact ? 20 : 24}
            className="mx-auto mb-2 animate-spin text-primary"
            aria-hidden
          />
          <p className="font-medium text-sm">Uploading…</p>
        </>
      ) : (
        <>
          <Upload
            size={compact ? 20 : 24}
            className="mx-auto mb-2 text-text-secondary"
            aria-hidden
          />
          <p className="font-medium text-sm">Drag & drop signed PDF</p>
          <p className="text-xs text-text-secondary mt-1">
            Or browse · PDF only · max 50 MB
          </p>
        </>
      )}
    </div>
  );
}
