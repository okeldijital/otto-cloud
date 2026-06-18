"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, AlertTriangle, ChevronRight, GitBranch } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

function statusColor(s: string): string {
  const map: Record<string, string> = {
    not_started: "#6b7280", in_progress: "#3b82f6", review: "#f59e0b",
    approved: "#10b981", blocked: "#ef4444", completed: "#10b981",
  };
  return map[s] || "#6b7280";
}

function depTypeColor(t: string): string {
  const map: Record<string, string> = { blocks: "#f59e0b", depends_on: "#3b82f6", related_to: "#8b5cf6" };
  return map[t] || "#6b7280";
}

interface DagNode {
  id: number; name: string; status: string; depth: number;
}

interface DagEdge {
  sourceId: number; targetId: number; type: string;
}

export default function DependencySection({ workspace, workspaceId }: SectionProps) {
  const [deps, setDeps] = useState<any[]>([]);
  const [dag, setDag] = useState<{ nodes: DagNode[]; edges: DagEdge[]; topologicalOrder: number[]; cycles: number[][]; criticalPath: number[]; blocked: number[]; hasCycle: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source_id: "", target_id: "", dependency_type: "blocks" });
  const deliverables = workspace.deliverables || [];

  const fetchDeps = async () => {
    try {
      const { data } = await api.get(`/workspace/${workspaceId}/dependencies`);
      setDeps(data.dependencies || []);
      setDag(data.dag || null);
    } catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchDeps(); }, [workspaceId]);

  const createDep = async () => {
    if (!form.source_id || !form.target_id) return;
    try {
      await api.post(`/workspace/${workspaceId}/dependencies`, form);
      setForm({ source_id: "", target_id: "", dependency_type: "blocks" });
      setShowForm(false);
      fetchDeps();
    } catch { /* */ }
  };

  const deleteDep = async (sourceId: number, targetId: number) => {
    try {
      await api.delete(`/workspace/${workspaceId}/dependencies?source_id=${sourceId}&target_id=${targetId}`);
      fetchDeps();
    } catch { /* */ }
  };

  const deliverableOptions = deliverables.map((d: any) => (
    <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
  ));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Dependencies ({deps.length})</h3>
          {dag?.hasCycle && (
            <Badge variant="danger"><AlertTriangle size={12} /> Cycle detected</Badge>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}><Plus size={14} /> Add Dependency</Button>
      </div>

      {showForm && (
        <Card>
          <div className="flex gap-3 items-end flex-wrap">
            <div><label className="text-[10px] text-text-secondary font-bold">Source (depends on)</label>
              <select className="input" value={form.source_id} onChange={(e) => setForm({ ...form, source_id: e.target.value })}>
                <option value="">Select deliverable...</option>
                {deliverableOptions}
              </select>
            </div>
            <div><label className="text-[10px] text-text-secondary font-bold">Target (blocked by)</label>
              <select className="input" value={form.target_id} onChange={(e) => setForm({ ...form, target_id: e.target.value })}>
                <option value="">Select deliverable...</option>
                {deliverableOptions}
              </select>
            </div>
            <div><label className="text-[10px] text-text-secondary font-bold">Type</label>
              <select className="input" value={form.dependency_type} onChange={(e) => setForm({ ...form, dependency_type: e.target.value })}>
                <option value="blocks">Blocks</option>
                <option value="depends_on">Depends On</option>
                <option value="related_to">Related To</option>
              </select>
            </div>
            <Button variant="primary" size="sm" onClick={createDep}>Create</Button>
          </div>
        </Card>
      )}

      {dag && dag.hasCycle && (
        <Card title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-red-400" /> Cycle Detected</span>}>
          <p className="text-sm text-text-secondary mb-3">The following dependency cycles must be resolved:</p>
          {dag.cycles.map((cycle, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 text-sm">
              {cycle.map((nodeId, j) => (
                <span key={j} className="flex items-center gap-1">
                  <span className="text-white">{deliverables.find((d: any) => d.id === nodeId)?.name || `#${nodeId}`}</span>
                  {j < cycle.length - 1 && <ChevronRight size={14} className="text-text-secondary" />}
                </span>
              ))}
            </div>
          ))}
        </Card>
      )}

      {(dag?.criticalPath?.length ?? 0) > 1 && (
        <Card title={<span className="flex items-center gap-2"><GitBranch size={16} className="text-accent" /> Critical Path</span>}>
          <div className="flex items-center gap-2 flex-wrap">
            {dag!.criticalPath.map((nodeId, i) => (
              <span key={nodeId} className="flex items-center gap-1">
                <Badge variant="primary">{deliverables.find((d: any) => d.id === nodeId)?.name || `#${nodeId}`}</Badge>
                {i < dag!.criticalPath.length - 1 && <ChevronRight size={14} className="text-text-secondary" />}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card title="Dependency Graph">
        {deps.length === 0 ? (
          <p className="text-text-secondary text-sm py-8 text-center">No dependencies defined. Add dependencies between deliverables to see the graph.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg width={Math.max(600, (dag?.nodes.length ?? 1) * 160)} height={(dag?.nodes.length ?? 1) * 80 + 40} className="min-w-full">
              {dag?.edges.map((edge, i) => {
                const source = dag.nodes.find((n) => n.id === edge.sourceId);
                const target = dag.nodes.find((n) => n.id === edge.targetId);
                if (!source || !target) return null;
                const x1 = 40 + source.depth * 140;
                const y1 = 20 + dag.nodes.indexOf(source) * 60 + 20;
                const x2 = 40 + target.depth * 140;
                const y2 = 20 + dag.nodes.indexOf(target) * 60 + 20;
                return (
                  <g key={i}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={depTypeColor(edge.type)} strokeWidth={2} strokeOpacity={0.5} markerEnd="url(#arrowhead)" />
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 4} textAnchor="middle" className="text-[8px]" fill={depTypeColor(edge.type)}>{edge.type}</text>
                  </g>
                );
              })}
              <defs>
                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
                </marker>
              </defs>
              {dag?.nodes.map((node, i) => {
                const x = 40 + node.depth * 140;
                const y = 20 + i * 60;
                const isCritical = dag.criticalPath.includes(node.id);
                const isBlocked = dag.blocked.includes(node.id);
                const w = 120;
                const h = 36;
                const borderColor = isBlocked ? "#ef4444" : isCritical ? "#6366f1" : statusColor(node.status);
                return (
                  <g key={node.id}>
                    <rect x={x} y={y} width={w} height={h} rx={8} fill="rgba(255,255,255,0.05)" stroke={borderColor} strokeWidth={isCritical || isBlocked ? 2 : 1} />
                    <text x={x + 60} y={y + 16} textAnchor="middle" fill="white" className="text-[10px]">{node.name.length > 18 ? node.name.slice(0, 16) + ".." : node.name}</text>
                    <text x={x + 60} y={y + 28} textAnchor="middle" fill={statusColor(node.status)} className="text-[8px] uppercase">{node.status.replace("_", " ")}{isBlocked ? " (blocked)" : ""}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </Card>

      <Card title="Dependency List">
        {deps.length === 0 ? (
          <p className="text-text-secondary text-sm py-4 text-center">No dependencies</p>
        ) : (
          <div className="space-y-2">
            {deps.map((dep: any) => {
              const sourceD = deliverables.find((d: any) => d.id === dep.source_id);
              const targetD = deliverables.find((d: any) => d.id === dep.target_id);
              return (
                <div key={dep.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: depTypeColor(dep.dependency_type) }} />
                    <span className="text-sm text-white truncate">{sourceD?.name || `#${dep.source_id}`}</span>
                    <ChevronRight size={14} className="text-text-secondary shrink-0" />
                    <span className="text-sm text-white truncate">{targetD?.name || `#${dep.target_id}`}</span>
                  </div>
                  <button onClick={() => deleteDep(dep.source_id, dep.target_id)} className="text-text-secondary hover:text-red-400 transition-colors shrink-0 ml-2"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
