"use client";
import { useState, useEffect } from "react";
import { Clock, Search, Filter } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

export default function ActivityLogTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const pageSize = 30;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { limit: pageSize, offset: page * pageSize };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity_type = entityFilter;
      const res = await api.get("/iam/audit", { params });
      setLogs(res.data?.items || []);
      setTotal(res.data?.total || 0);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, actionFilter, entityFilter]);

  function formatTime(d: string) {
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const actionColor = (action: string) => {
    if (action?.includes("created") || action?.includes("assigned") || action?.includes("activated")) return "success";
    if (action?.includes("deleted") || action?.includes("suspended") || action?.includes("removed")) return "critical";
    if (action?.includes("updated") || action?.includes("reset")) return "warn";
    return "neutral";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input className="input w-full pl-8" value={actionFilter} onChange={e => setActionFilter(e.target.value)} placeholder="Filter by action..." />
        </div>
        <div className="relative flex-1 max-w-xs">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input className="input w-full pl-8" value={entityFilter} onChange={e => setEntityFilter(e.target.value)} placeholder="Filter by entity type..." />
        </div>
      </div>

      <div className="bg-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">No audit log entries found.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.map((l: any) => (
              <div key={l.id} className="flex items-start gap-3 p-3 hover:bg-white/5 transition-colors">
                <Clock size={14} className="text-text-secondary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium">{l.users?.name || l.users?.email || "System"}</span>
                    <Badge variant={actionColor(l.action)} size="sm">{l.action}</Badge>
                    {l.entity_type && <span className="text-xs text-text-secondary">{l.entity_type}{l.entity_id ? ` #${l.entity_id}` : ""}</span>}
                  </div>
                  {l.entity_name && <p className="text-xs text-text-secondary mt-0.5">{l.entity_name}</p>}
                  {l.changes && typeof l.changes === "object" && Object.keys(l.changes).length > 0 && (
                    <pre className="text-[10px] text-text-secondary mt-1 font-mono bg-white/5 p-1 rounded overflow-x-auto">{JSON.stringify(l.changes, null, 1)}</pre>
                  )}
                </div>
                <span className="text-[10px] text-text-secondary shrink-0">{l.created_at ? formatTime(l.created_at) : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">{total} total entries</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <Button variant="ghost" size="sm" disabled={(page + 1) * pageSize >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
