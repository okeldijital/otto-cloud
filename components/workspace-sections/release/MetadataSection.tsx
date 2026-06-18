"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { type SectionProps } from "@/lib/workspace-engine";

export default function MetadataSection({ workspace }: SectionProps) {
  const release = workspace.release;
  if (!release) {
    return (
      <Card title="Release Metadata">
        <p className="text-text-secondary text-sm py-8 text-center">No release linked to this workspace</p>
      </Card>
    );
  }

  const fields = [
    { label: "Title", value: release.title },
    { label: "Artist ID", value: release.artist_id || "—" },
    { label: "Release Type", value: release.release_type || "—" },
    { label: "UPC", value: release.upc_code || "—" },
    { label: "Catalog #", value: release.catalog_number || "—" },
    { label: "Release Date", value: release.release_date ? new Date(release.release_date).toLocaleDateString() : "TBA" },
  ];

  const warnings = [];
  if (!release.upc_code) warnings.push({ label: "Missing UPC", severity: "high" });
  if (!release.cover_art_url) warnings.push({ label: "Missing Cover Art", severity: "high" });
  if (!release.release_date) warnings.push({ label: "No Release Date", severity: "medium" });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card title="Release Metadata">
          <div className="grid grid-cols-2 gap-6">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1">{f.label}</p>
                <p className="text-sm text-white">{f.value}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Credits">
          {release.credits ? (
            <pre className="text-sm text-text-secondary whitespace-pre-wrap">{typeof release.credits === "string" ? release.credits : JSON.stringify(release.credits, null, 2)}</pre>
          ) : (
            <p className="text-text-secondary text-sm py-4 text-center">No credits data</p>
          )}
        </Card>

        {release.cover_art_url && (
          <Card title="Cover Art">
            <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="w-full h-full object-cover" src={release.cover_art_url} alt="Cover Art" />
            </div>
          </Card>
        )}
      </div>

      <div>
        <Card title="AI Validation">
          {warnings.length === 0 ? (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle size={20} className="text-green-400" />
              <span className="text-sm text-green-400">All metadata fields complete</span>
            </div>
          ) : (
            <div className="space-y-2">
              {warnings.map((w) => (
                <div key={w.label} className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10">
                  <AlertCircle size={16} className="text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm text-red-400">{w.label}</p>
                  </div>
                  <Badge variant={w.severity === "high" ? "danger" : "warning"}>{w.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
