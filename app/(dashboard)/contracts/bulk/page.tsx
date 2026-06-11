"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

export default function BulkProcessingPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImporting(true);
    setResults([]);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(Boolean);
      const outcomes: any[] = [];
      for (const line of lines.slice(0, 100)) {
        const parts = line.split(",");
        if (parts.length < 2) continue;
        try {
          await api.post("/contracts", { title: parts[0].trim(), type: parts[1]?.trim() || "Other" });
          outcomes.push({ line: parts[0].trim(), status: "imported" });
        } catch (e: any) {
          outcomes.push({ line: parts[0].trim(), status: "error", error: e?.response?.data?.error || "Failed" });
        }
      }
      setResults(outcomes);
    } catch {
      alert("Failed to read file");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Bulk Processing" subtitle="Import and process contracts in bulk" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Import Contracts" subtitle="Upload a CSV file with contract titles and types">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-accent/50 transition-colors">
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} />
              <Upload size={32} className="mx-auto text-text-secondary mb-3" />
              <p className="text-sm text-text-secondary mb-2">Drop a CSV file here or click to browse</p>
              <p className="text-xs text-text-secondary">Format: title, type (one per line)</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={() => fileRef.current?.click()}>
                <FileText size={14} /> Select File
              </Button>
            </div>
            {importing && (
              <div className="flex items-center gap-2 text-sm text-accent">
                <Loader size={16} className="animate-spin" /> Importing contracts...
              </div>
            )}
          </div>
        </Card>
        <Card title="Results" subtitle={`${results.length} contracts processed`}>
          {results.length === 0 ? (
            <p className="text-sm text-text-secondary">No import results yet. Upload a CSV file to begin.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-white/5 rounded-lg">
                  {r.status === "imported" ? (
                    <CheckCircle size={14} className="text-success shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-danger shrink-0" />
                  )}
                  <span className="text-white truncate">{r.line}</span>
                  <Badge variant={r.status === "imported" ? "success" : "danger"} size="sm" className="ml-auto shrink-0">
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
