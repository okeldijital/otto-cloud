"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

/**
 * Rights Review Workspace — approve/reject candidates.
 * No AI chat. Only verified-contract-derived candidates.
 */
export default function RightsReviewPage() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [contractId, setContractId] = useState("");
  const [promoting, setPromoting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await api.get("/rights/review?status=pending");
      setCandidates(res.data?.data?.candidates || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (candidateId: string, decision: "approve" | "reject") => {
    try {
      setBusyId(candidateId);
      await api.post("/rights/review", { candidateId, decision });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Decision failed");
    } finally {
      setBusyId(null);
    }
  };

  const promote = async () => {
    const id = parseInt(contractId, 10);
    if (!Number.isFinite(id) || id <= 0) {
      setError("Enter a valid contract id");
      return;
    }
    try {
      setPromoting(true);
      setError("");
      await api.post("/rights/promote", { contractId: id });
      setContractId("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Promotion failed");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Rights Review</h1>
          <p className="text-sm text-text-secondary mt-1">
            Human validation of rights candidates from verified contracts
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/rights">
            <Button variant="secondary" size="sm">
              Registry
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-text-secondary">
            Promote from verified contract #
          </label>
          <input
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
            placeholder="Contract id"
            className="mt-1 block w-40 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white"
          />
        </div>
        <Button size="sm" disabled={promoting} onClick={promote}>
          {promoting ? <Loader2 className="animate-spin" size={14} /> : null}
          Run promotion
        </Button>
      </Card>

      {error && (
        <div className="text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-text-secondary gap-2 text-sm">
          <Loader2 className="animate-spin" size={18} /> Loading candidates…
        </div>
      ) : candidates.length === 0 ? (
        <Card className="p-10 text-center text-sm text-text-secondary">
          No pending candidates.
        </Card>
      ) : (
        <div className="space-y-3">
          {candidates.map((c) => (
            <Card key={c.id} className="p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="text-white font-medium">{c.title}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {c.category} · Contract #{c.contractId}
                    {c.confidence != null
                      ? ` · confidence ${(c.confidence * 100).toFixed(0)}%`
                      : ""}
                  </p>
                </div>
                <Badge variant="warn">{c.status}</Badge>
              </div>
              {c.description && (
                <p className="text-sm text-text-secondary line-clamp-3">
                  {c.description}
                </p>
              )}
              {c.clauseReference && (
                <p className="text-xs text-text-secondary">
                  Clause: {c.clauseReference}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busyId === c.id}
                  onClick={() => decide(c.id, "approve")}
                >
                  <Check size={14} /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === c.id}
                  onClick={() => decide(c.id, "reject")}
                >
                  <X size={14} /> Reject
                </Button>
                {c.contractId && (
                  <Link
                    href={`/contracts/${c.contractId}`}
                    className="text-xs text-accent self-center ml-2 hover:underline"
                  >
                    Open contract
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
