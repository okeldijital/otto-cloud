"use client";

import { AlertCircle, CheckCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EntityArtwork from "@/components/media/EntityArtwork";
import { useAttachment } from "@/hooks/useAttachment";
import { type SectionProps } from "@/lib/workspace-engine";

export default function MetadataSection({ workspace }: SectionProps) {
  const release = workspace.release;
  const { url: coverUrl } = useAttachment(
    release ? "release" : null,
    release?.id
  );

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
  // Prefer Storage Service attachment over legacy cover_art_url column
  if (!coverUrl && !release.cover_art_url) warnings.push({ label: "Missing Cover Art", severity: "high" });
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

        <Card title="Cover Art">
          <EntityArtwork
            entityType="release"
            entityId={release.id}
            alt={release.title || "Cover Art"}
            size={192}
            placeholder="release"
            className="rounded-xl"
            style={{ borderRadius: 12 }}
          />
        </Card>
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
