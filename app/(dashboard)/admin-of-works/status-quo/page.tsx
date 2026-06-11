"use client";

import { useState, useEffect } from "react";
import { Search, Filter, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import api from "@/lib/api";

const SEVERITY_VARIANTS: Record<string, string> = {
  RED: "critical",
  AMBER: "warn",
  GREEN: "success",
};

export default function AdminStatusQuoPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("All");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/office/status-quo");
      setItems(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = severityFilter === "All" ? items : items.filter((i) => i.severity === severityFilter);

  const redCount = items.filter((i) => i.severity === "RED" && !i.resolved_at).length;
  const amberCount = items.filter((i) => i.severity === "AMBER" && !i.resolved_at).length;
  const greenCount = items.filter((i) => i.severity === "GREEN" && !i.resolved_at).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Status Quo" subtitle="Contract completeness and status overview" />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4 backdrop-blur-xl">
          <p className="text-2xl font-bold text-white">{redCount}</p>
          <p className="text-xs text-danger font-medium">Critical Issues</p>
        </div>
        <div className="bg-amber/10 border border-amber/20 rounded-2xl p-4 backdrop-blur-xl">
          <p className="text-2xl font-bold text-white">{amberCount}</p>
          <p className="text-xs text-amber font-medium">Warnings</p>
        </div>
        <div className="bg-success/10 border border-success/20 rounded-2xl p-4 backdrop-blur-xl">
          <p className="text-2xl font-bold text-white">{greenCount}</p>
          <p className="text-xs text-success font-medium">Healthy</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {["All", "RED", "AMBER", "GREEN"].map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === s ? "bg-white/10 text-white" : "text-text-secondary hover:text-white hover:bg-white/5"}`}
          >
            {s === "All" ? "All Issues" : s}
          </button>
        ))}
      </div>

      <Card noPadding>
        {loading ? (
          <div className="p-12 text-center text-text-secondary">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <ShieldCheck size={32} className="mx-auto mb-2 text-success" />
            No issues found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-secondary border-b border-white/5">
                  <th className="p-4 font-bold">Severity</th>
                  <th className="p-4 font-bold">Issue</th>
                  <th className="p-4 font-bold">Entity</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">Created</th>
                  <th className="p-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <Badge variant={SEVERITY_VARIANTS[item.severity] || "neutral"} size="sm">{item.severity}</Badge>
                    </td>
                    <td className="p-4 text-sm text-white">{item.summary}</td>
                    <td className="p-4 text-sm text-text-secondary">{item.entity_type} #{item.entity_id}</td>
                    <td className="p-4 text-sm text-text-secondary">{item.issue_type || "—"}</td>
                    <td className="p-4 text-sm text-text-secondary">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</td>
                    <td className="p-4">
                      {item.resolved_at ? (
                        <span className="flex items-center gap-1 text-xs text-success"><CheckCircle size={12} /> Resolved</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber"><AlertTriangle size={12} /> Open</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
