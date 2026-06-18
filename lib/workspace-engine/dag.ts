export interface DependencyEdge {
  sourceId: number;
  targetId: number;
  type: string;
}

export interface DagNode {
  id: number;
  name: string;
  status: string;
  priority?: string | null;
  due_date?: Date | null;
  depth: number;
}

export interface DagResult {
  nodes: DagNode[];
  edges: DependencyEdge[];
  topologicalOrder: number[];
  cycles: number[][];
  criticalPath: number[];
  blocked: number[];
  hasCycle: boolean;
}

export function buildDag(
  edges: DependencyEdge[],
  deliverables: { id: number; name: string; status: string; priority?: string | null; due_date?: Date | null }[]
): DagResult {
  const adjacency = new Map<number, number[]>();
  const reverseAdjacency = new Map<number, number[]>();
  const nodeSet = new Set<number>();

  const deliverableMap = new Map(deliverables.map((d) => [d.id, d]));

  for (const edge of edges) {
    if (!adjacency.has(edge.sourceId)) adjacency.set(edge.sourceId, []);
    adjacency.get(edge.sourceId)!.push(edge.targetId);

    if (!reverseAdjacency.has(edge.targetId)) reverseAdjacency.set(edge.targetId, []);
    reverseAdjacency.get(edge.targetId)!.push(edge.sourceId);

    nodeSet.add(edge.sourceId);
    nodeSet.add(edge.targetId);
  }

  for (const d of deliverables) {
    nodeSet.add(d.id);
  }

  const cycles = detectCycles(adjacency, nodeSet);
  const hasCycle = cycles.length > 0;

  const topologicalOrder = hasCycle ? [] : topologicalSort(adjacency, nodeSet);

  const blocked = computeBlocked(edges, deliverables);

  const criticalPath = findCriticalPath(edges, deliverables);

  const nodes: DagNode[] = [];
  const depthMap = new Map<number, number>();
  if (!hasCycle) {
    topologicalOrder.forEach((id, i) => {
      depthMap.set(id, i);
    });
  }
  for (const id of nodeSet) {
    const d = deliverableMap.get(id);
    nodes.push({
      id,
      name: d?.name || `Deliverable #${id}`,
      status: d?.status || "unknown",
      priority: d?.priority,
      due_date: d?.due_date,
      depth: depthMap.get(id) ?? 0,
    });
  }

  return { nodes, edges, topologicalOrder, cycles, criticalPath, blocked, hasCycle };
}

function detectCycles(adjacency: Map<number, number[]>, nodeSet: Set<number>): number[][] {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<number, number>();
  const parent = new Map<number, number>();
  const cycles: number[][] = [];

  for (const n of nodeSet) color.set(n, WHITE);

  function dfs(u: number) {
    color.set(u, GRAY);
    for (const v of adjacency.get(u) || []) {
      if (!color.has(v)) {
        parent.set(v, u);
        dfs(v);
      } else if (color.get(v) === GRAY) {
        const cycle: number[] = [v];
        let cur = u;
        while (cur !== v) {
          cycle.push(cur);
          cur = parent.get(cur)!;
        }
        cycle.push(v);
        cycle.reverse();
        cycles.push(cycle);
      }
    }
    color.set(u, BLACK);
  }

  for (const n of nodeSet) {
    if (color.get(n) === WHITE) dfs(n);
  }

  return cycles;
}

function topologicalSort(adjacency: Map<number, number[]>, nodeSet: Set<number>): number[] {
  const visited = new Set<number>();
  const order: number[] = [];

  function dfs(u: number) {
    visited.add(u);
    for (const v of adjacency.get(u) || []) {
      if (!visited.has(v)) dfs(v);
    }
    order.push(u);
  }

  for (const n of nodeSet) {
    if (!visited.has(n)) dfs(n);
  }

  return order.reverse();
}

function computeBlocked(
  edges: DependencyEdge[],
  deliverables: { id: number; status: string }[]
): number[] {
  const statusMap = new Map(deliverables.map((d) => [d.id, d.status]));
  const blocked = new Set<number>();

  const outEdges = new Map<number, number[]>();
  for (const edge of edges) {
    if (!outEdges.has(edge.sourceId)) outEdges.set(edge.sourceId, []);
    outEdges.get(edge.sourceId)!.push(edge.targetId);
  }

  function propagate(source: number) {
    for (const target of outEdges.get(source) || []) {
      if (!blocked.has(target)) {
        blocked.add(target);
        propagate(target);
      }
    }
  }

  for (const edge of edges) {
    if (statusMap.get(edge.sourceId) === "blocked") {
      blocked.add(edge.targetId);
      propagate(edge.targetId);
    }
  }

  return Array.from(blocked);
}

function findCriticalPath(
  edges: DependencyEdge[],
  deliverables: { id: number; name: string; status: string; due_date?: Date | null }[]
): number[] {
  const statusMap = new Map(deliverables.map((d) => [d.id, d]));
  const inEdges = new Map<number, number[]>();
  const outEdges = new Map<number, number[]>();
  const allNodes = new Set<number>();

  for (const edge of edges) {
    if (!inEdges.has(edge.targetId)) inEdges.set(edge.targetId, []);
    inEdges.get(edge.targetId)!.push(edge.sourceId);
    if (!outEdges.has(edge.sourceId)) outEdges.set(edge.sourceId, []);
    outEdges.get(edge.sourceId)!.push(edge.targetId);
    allNodes.add(edge.sourceId);
    allNodes.add(edge.targetId);
  }

  const ends: number[] = [];
  for (const n of allNodes) {
    if (!outEdges.has(n) || outEdges.get(n)!.length === 0) ends.push(n);
  }

  if (ends.length === 0) return [];

  let longestPath: number[] = [];
  let longestDuration = 0;

  const visited = new Set<number>();

  function dfs(node: number, path: number[]) {
    visited.add(node);
    const newPath = [...path, node];
    const current = statusMap.get(node);
    const duration = current?.due_date ? new Date(current.due_date).getTime() : 0;

    if (!outEdges.has(node) || outEdges.get(node)!.length === 0) {
      if (duration > longestDuration) {
        longestDuration = duration;
        longestPath = [...newPath];
      }
      visited.delete(node);
      return;
    }

    for (const next of outEdges.get(node) || []) {
      if (!visited.has(next)) dfs(next, newPath);
    }

    visited.delete(node);
  }

  const starts: number[] = [];
  for (const n of allNodes) {
    if (!inEdges.has(n) || inEdges.get(n)!.length === 0) starts.push(n);
  }

  for (const s of starts) {
    visited.clear();
    dfs(s, []);
  }

  return longestPath;
}

export function isBlockedBy(
  deliverableId: number,
  edges: DependencyEdge[],
  statusMap: Map<number, string>
): number[] {
  const blockers: number[] = [];
  const directDeps = edges.filter((e) => e.sourceId === deliverableId);

  for (const dep of directDeps) {
    const targetStatus = statusMap.get(dep.targetId);
    if (targetStatus === "blocked" || targetStatus === "not_started") {
      blockers.push(dep.targetId);
    }
  }

  return blockers;
}
