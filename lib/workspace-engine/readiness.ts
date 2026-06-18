import { ReadinessResult, ReadinessCategory } from "./types";

export interface ReadinessInput {
  deliverables: any[];
  approvals: any[];
  publications: any[];
  videos: any[];
  milestones: any[];
  dependencies?: any[];
}

const DEFAULT_WEIGHTS: ReadinessCategory[] = [
  { label: "Metadata", key: "metadata", score: 0, weight: 20 },
  { label: "Artwork", key: "artwork", score: 0, weight: 15 },
  { label: "Marketing", key: "marketing", score: 0, weight: 20 },
  { label: "Distribution", key: "distribution", score: 0, weight: 20 },
  { label: "Approvals", key: "approvals", score: 0, weight: 15 },
  { label: "Videos", key: "videos", score: 0, weight: 10 },
];

export function calculateReadiness(input: ReadinessInput, weights?: ReadinessCategory[]): ReadinessResult {
  const cats = (weights || DEFAULT_WEIGHTS).map((w) => ({ ...w }));

  const calcScore = (items: any[], statusField: string, doneStatuses: string[]): number => {
    if (!items || items.length === 0) return 0;
    const done = items.filter((i) => doneStatuses.includes(i[statusField])).length;
    return Math.round((done / items.length) * 100);
  };

  const catMap: Record<string, (input: ReadinessInput) => number> = {
    metadata: () => 0,
    artwork: (i) => calcScore(i.deliverables, "status", ["approved"]),
    marketing: (i) => calcScore(i.publications, "status", ["approved", "published", "scheduled"]),
    distribution: (i) => calcScore(i.deliverables, "status", ["approved"]),
    approvals: (i) => calcScore(i.approvals, "status", ["approved"]),
    videos: (i) => calcScore(i.videos, "status", ["completed"]),
  };

  for (const cat of cats) {
    const fn = catMap[cat.key];
    if (fn) {
      cat.score = fn(input);
    }
  }

  const totalWeight = cats.reduce((sum, c) => sum + c.weight, 0);
  const overallScore = totalWeight > 0
    ? Math.round(cats.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight)
    : 0;

  return { overallScore, categories: cats };
}

export function calculateWorkspaceHealth(input: ReadinessInput & { timeline_events?: any[] }): {
  score: number;
  items: { type: string; label: string; severity: string; entityType: string; entityId: number }[];
} {
  const items: any[] = [];
  const now = new Date();
  const deps = input.dependencies || [];
  const statusMap = new Map((input.deliverables || []).map((d: any) => [d.id, d.status]));
  const blockedByDeps = new Set<number>();

  for (const dep of deps) {
    if (statusMap.get(dep.source_id) === "blocked") {
      blockedByDeps.add(dep.target_id);
    }
  }

  for (const d of input.deliverables || []) {
    if (blockedByDeps.has(d.id) && d.status !== "blocked" && d.status !== "completed" && d.status !== "approved") {
      items.push({ type: "dependency_blocked", label: `"${d.name}" blocked by dependency`, severity: "high", entityType: "deliverable", entityId: d.id });
    }
  }

  const overdueDeliverables = (input.deliverables || []).filter(
    (d: any) => d.due_date && new Date(d.due_date) < now && d.status !== "approved" && d.status !== "completed"
  );
  for (const d of overdueDeliverables) {
    items.push({ type: "overdue", label: `"${d.name}" overdue`, severity: "high", entityType: "deliverable", entityId: d.id });
  }

  const blockedItems = (input.deliverables || []).filter((d: any) => d.status === "blocked");
  for (const d of blockedItems) {
    items.push({ type: "blocked", label: `"${d.name}" blocked`, severity: "high", entityType: "deliverable", entityId: d.id });
  }

  const pendingApprovals = (input.approvals || []).filter((a: any) => a.status === "pending");
  for (const a of pendingApprovals) {
    items.push({ type: "risk", label: `"${a.name}" awaiting approval`, severity: "medium", entityType: "approval", entityId: a.id });
  }

  const overdueMilestones = (input.milestones || []).filter(
    (m: any) => m.due_date && new Date(m.due_date) < now && m.status !== "completed"
  );
  for (const m of overdueMilestones) {
    items.push({ type: "overdue", label: `Milestone "${m.name}" overdue`, severity: "medium", entityType: "milestone", entityId: m.id });
  }

  const overdueCount = items.filter((i) => i.type === "overdue").length;
  const blockedCount = items.filter((i) => i.type === "blocked").length;
  const riskCount = items.filter((i) => i.type === "risk").length;

  const totalDeliverables = (input.deliverables || []).length;
  const completedDeliverables = (input.deliverables || []).filter((d: any) => d.status === "approved" || d.status === "completed").length;
  const deliveryRate = totalDeliverables > 0 ? completedDeliverables / totalDeliverables : 1;

  const healthScore = Math.max(0, Math.min(100, Math.round(
    (deliveryRate * 40) +
    (overdueCount === 0 ? 20 : Math.max(0, 20 - overdueCount * 5)) +
    (blockedCount === 0 ? 20 : Math.max(0, 20 - blockedCount * 10)) +
    (riskCount === 0 ? 20 : Math.max(0, 20 - riskCount * 3))
  )));

  return { score: healthScore, items };
}
