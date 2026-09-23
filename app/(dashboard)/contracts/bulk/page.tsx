"use client";

import { useRef, useState } from "react";
import { Upload, AlertCircle, FileText, Loader } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
};

function emptyResult(): ImportResult {
  return { imported: 0, skipped: 0, errors: [], warnings: [] };
}

function contractTitleFromFile(fileName: string) {
  return fileName.replace(/\.pdf$/i, "").trim() || "Imported Contract";
}

export default function ContractImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const importPdfContracts = async (files: File[]) => {
    const next = emptyResult();

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const row = index + 1;

      try {
        if (file.size > 50 * 1024 * 1024) {
          throw new Error("PDF exceeds the 50 MB maximum.");
        }

        const { data: contract } = await api.post("/contracts", {
          title: contractTitleFromFile(file.name),
        });

        const formData = new FormData();
        formData.append("file", file);

        await api.post(`/contracts?action=upload_document&id=${contract.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        next.imported += 1;
      } catch (err: any) {
        next.errors.push({
          row,
          message: `${file.name}: ${err?.response?.data?.error || err?.message || "Import failed"}`,
        });
      }
    }

    return next;
  };

  const importStructuredFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity", "contracts");

    const { data } = await api.post("/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return data as ImportResult;
  };

  const handleFiles = async (incoming: File[]) => {
    if (!incoming.length) return;

    setImporting(true);
    setResult(null);

    try {
      const pdfFiles = incoming.filter((file) =>
        file.type === "application/pdf" || /\.pdf$/i.test(file.name)
      );
      const nonPdfFiles = incoming.filter((file) => !(
        file.type === "application/pdf" || /\.pdf$/i.test(file.name)
      ));

      if (pdfFiles.length > 0 && nonPdfFiles.length > 0) {
        setResult({
          ...emptyResult(),
          errors: [{
            row: 0,
            message: "Choose either PDF contract files or one CSV/XLSX/JSON metadata file per import.",
          }],
        });
        return;
      }

      if (pdfFiles.length > 0) {
        setResult(await importPdfContracts(pdfFiles));
        return;
      }

      if (incoming.length !== 1) {
        setResult({
          ...emptyResult(),
          errors: [{
            row: 0,
            message: "CSV, XLSX, and JSON metadata imports accept one file at a time.",
          }],
        });
        return;
      }

      setResult(await importStructuredFile(incoming[0]));
    } catch (err: any) {
      setResult({
        ...emptyResult(),
        errors: [{
          row: 0,
          message: err?.response?.data?.error || err?.message || "Import failed",
        }],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    void handleFiles(Array.from(e.dataTransfer.files || []));
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Contracts"
        subtitle="Upload signed PDF contracts in bulk, or import contract metadata."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Add contracts" subtitle="PDF is the standard contract document format in Otto.">
          <div className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.csv,.xlsx,.xls,.json,application/pdf,text/csv,application/json"
              multiple
              onChange={(e) => {
                void handleFiles(Array.from(e.target.files || []));
                e.currentTarget.value = "";
              }}
            />

            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                dragActive ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={openPicker}
            >
              <Upload size={32} className="mx-auto text-text-secondary mb-3" />
              <p className="text-sm font-medium text-text-primary mb-1">
                Drop signed PDFs here or click to browse
              </p>
              <p className="text-xs text-text-secondary">
                PDF only for bulk contract uploads · maximum 50 MB per file
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface/40 p-4 space-y-2">
              <div className="flex items-start gap-3">
                <FileText size={18} className="text-accent mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-text-primary">How PDF import works</p>
                  <p className="text-text-secondary mt-1">
                    Each PDF creates a contract record using the filename as its title, then stores the PDF in the contract document repository.
                    You can organise and connect the contracts after import.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-text-secondary space-y-1">
              <p>
                <strong>Metadata import:</strong> CSV, XLSX, or JSON can still be used when you already have structured contract records.
              </p>
              <p>
                CSV headers: <code>Title</code>, <code>Contract #</code>, <code>Type</code>, <code>Status</code>, <code>Start Date</code>, <code>End Date</code>, <code>Territory</code>, <code>Exclusivity</code>.
              </p>
            </div>

            {importing && (
              <div className="flex items-center gap-2 text-sm text-accent">
                <Loader size={16} className="animate-spin" />
                Importing contracts...
              </div>
            )}
          </div>
        </Card>

        <Card
          title="Results"
          subtitle={result ? `${result.imported} imported, ${result.errors.length} errors` : ""}
        >
          {!result ? (
            <p className="text-sm text-text-secondary">Upload files to begin.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="bg-success/10 rounded-xl p-3 text-center flex-1">
                  <div className="text-2xl font-bold text-success">{result.imported}</div>
                  <div className="text-xs text-text-secondary">Imported</div>
                </div>
                <div className="bg-danger/10 rounded-xl p-3 text-center flex-1">
                  <div className="text-2xl font-bold text-danger">{result.errors.length}</div>
                  <div className="text-xs text-text-secondary">Errors</div>
                </div>
                <div className="bg-warn/10 rounded-xl p-3 text-center flex-1">
                  <div className="text-2xl font-bold text-warn">{result.skipped}</div>
                  <div className="text-xs text-text-secondary">Skipped</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  <p className="text-xs font-bold text-danger uppercase tracking-wider">Errors</p>
                  {result.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm p-2 bg-danger/5 rounded-lg">
                      <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                      <span className="text-text-secondary">Row {error.row}: {error.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  <p className="text-xs font-bold text-warn uppercase tracking-wider">Warnings</p>
                  {result.warnings.map((warning, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm p-2 bg-warn/5 rounded-lg">
                      <AlertCircle size={14} className="text-warn shrink-0" />
                      <span className="text-text-secondary">{warning.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
