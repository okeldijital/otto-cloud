"use client";

import { useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

export default function BulkProcessingPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity", "contracts");
      const { data } = await api.post("/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bulk Processing" subtitle="Import contracts in bulk via CSV, XLSX, or JSON" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Import Contracts">
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                dragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".csv,.xlsx,.xls,.json";
                input.onchange = (e: any) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); };
                input.click();
              }}
            >
              <Upload size={32} className="mx-auto text-text-secondary mb-3" />
              <p className="text-sm text-text-secondary mb-2">Drop a file or click to browse</p>
              <p className="text-xs text-text-secondary">Supports CSV, XLSX, JSON</p>
            </div>
            {importing && (
              <div className="flex items-center gap-2 text-sm text-accent">
                <Loader size={16} className="animate-spin" /> Importing...
              </div>
            )}
            <div className="text-xs text-text-secondary space-y-1">
              <p><strong>CSV format:</strong> Column headers must match field labels</p>
              <p>Required: <code>Title</code>. Optional: <code>Contract #</code>, <code>Type</code>, <code>Status</code>, <code>Start Date</code>, <code>End Date</code>, <code>Territory</code>, <code>Exclusivity</code></p>
            </div>
          </div>
        </Card>

        <Card title="Results" subtitle={result ? `${result.imported} imported, ${result.errors?.length || 0} errors` : ""}>
          {!result ? (
            <p className="text-sm text-text-secondary">Upload a file to begin.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="bg-success/10 rounded-xl p-3 text-center flex-1">
                  <div className="text-2xl font-bold text-success">{result.imported}</div>
                  <div className="text-xs text-text-secondary">Imported</div>
                </div>
                <div className="bg-danger/10 rounded-xl p-3 text-center flex-1">
                  <div className="text-2xl font-bold text-danger">{result.errors?.length || 0}</div>
                  <div className="text-xs text-text-secondary">Errors</div>
                </div>
                <div className="bg-warn/10 rounded-xl p-3 text-center flex-1">
                  <div className="text-2xl font-bold text-warn">{result.skipped || 0}</div>
                  <div className="text-xs text-text-secondary">Skipped</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  <p className="text-xs font-bold text-danger uppercase tracking-wider">Errors</p>
                  {result.errors.map((e: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm p-2 bg-danger/5 rounded-lg">
                      <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
                      <span className="text-text-secondary">Row {e.row}: {e.message}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.warnings?.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  <p className="text-xs font-bold text-warn uppercase tracking-wider">Warnings</p>
                  {result.warnings.map((w: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-2 bg-warn/5 rounded-lg">
                      <AlertCircle size={14} className="text-warn shrink-0" />
                      <span className="text-text-secondary">{w.message}</span>
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
