"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props {
  contractId: string | number;
}

const TYPE_VARIANT: Record<string, string> = {
  status_change: "primary",
  amendment: "warn",
  renewal: "success",
  supersession: "critical",
  lifecycle: "neutral",
  verification_completed: "success",
  promoted: "success",
  relationship_created: "primary",
};

/**
 * Append-only operational timeline (read-only UI).
 */
export default function ContractTimelinePanel({ contractId }: Props) {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.get(`/contracts/${contractId}/timeline`);
      setEntries(res.data?.data?.timeline || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load timeline.");
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-text-secondary gap-2 items-center">
        <Loader2 className="animate-spin" size={18} /> Loading timeline…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-secondary">
          Append-only operational history. Future reminders will appear here.
        </p>
        <Button variant="ghost" size="sm" onClick={() => load()}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-text-secondary">
            No timeline entries yet. Lifecycle changes, amendments, and renewals will
            appear here.
          </p>
        </Card>
      ) : (
        <ol className="relative border-l border-white/10 ml-3 space-y-4">
          {entries.map((e) => (
            <li key={e.id} className="ml-4">
              <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary/80 border border-white/20" />
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge
                    variant={(TYPE_VARIANT[e.entryType] || "neutral") as any}
                    size="sm"
                  >
                    {e.entryType}
                  </Badge>
                  <time className="text-xs text-text-secondary">
                    {e.occurredAt ? new Date(e.occurredAt).toLocaleString() : ""}
                  </time>
                </div>
                <p className="text-sm font-medium text-white">{e.title}</p>
                {e.description && (
                  <p className="text-xs text-text-secondary mt-1">{e.description}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
