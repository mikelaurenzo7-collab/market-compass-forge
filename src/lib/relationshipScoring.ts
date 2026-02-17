// ── Relationship Intelligence Engine ──────────────────────────────────
// The feature Affinity charges $2,400/seat/yr for. We're giving it away
// as part of the OS to make switching costs infinite.

export interface Contact {
  id: string;
  name: string;
  title: string | null;
  firm: string | null;
  email?: string | null;
  sectors: string[];
  relationship_strength: number; // 0-100
  last_interaction: string | null;
  interaction_count: number;
  deal_overlap_count: number;
  intro_success_rate: number;
  is_verified: boolean;
  source: "manual" | "crm_import" | "email_sync" | "meeting" | "deal_room";
  tags: string[];
}

export interface RelationshipEdge {
  source_id: string;
  target_id: string;
  relationship_type: string;
  confidence: number;
  source_name?: string;
  target_name?: string;
}

export interface IntroPath {
  hops: { id: string; name: string; firm?: string | null }[];
  total_strength: number;
  path_confidence: number;
}

// ── Scoring Algorithm ──────────────────────────────────────────────────
// Relationship strength = weighted combination of signals
export function computeRelationshipStrength(params: {
  interaction_count: number;
  days_since_last_interaction: number | null;
  deal_overlap_count: number;
  intro_success_rate: number;
  is_verified: boolean;
  shared_room_count: number;
}): number {
  const {
    interaction_count,
    days_since_last_interaction,
    deal_overlap_count,
    intro_success_rate,
    is_verified,
    shared_room_count,
  } = params;

  // Interaction frequency score (0-30 pts)
  const interactionScore = Math.min(30, interaction_count * 3);

  // Recency score (0-25 pts) — decays over time
  let recencyScore = 25;
  if (days_since_last_interaction !== null) {
    if (days_since_last_interaction > 365) recencyScore = 0;
    else if (days_since_last_interaction > 180) recencyScore = 5;
    else if (days_since_last_interaction > 90) recencyScore = 10;
    else if (days_since_last_interaction > 30) recencyScore = 15;
    else if (days_since_last_interaction > 7) recencyScore = 20;
    // else stays at 25
  }

  // Deal co-participation score (0-20 pts)
  const dealScore = Math.min(20, deal_overlap_count * 5);

  // Intro success rate (0-15 pts)
  const introScore = Math.round(intro_success_rate * 15);

  // Verification bonus (0-5 pts)
  const verifiedBonus = is_verified ? 5 : 0;

  // Shared rooms bonus (0-5 pts)
  const roomBonus = Math.min(5, shared_room_count * 2);

  return Math.min(100, interactionScore + recencyScore + dealScore + introScore + verifiedBonus + roomBonus);
}

// ── Relationship Health Categories ─────────────────────────────────────
export type RelationshipHealth = "strong" | "warm" | "cooling" | "cold" | "dormant";

export function getRelationshipHealth(strength: number, daysSinceInteraction: number | null): RelationshipHealth {
  if (daysSinceInteraction !== null && daysSinceInteraction > 180) return "dormant";
  if (strength >= 80) return "strong";
  if (strength >= 60) return "warm";
  if (strength >= 40) return "cooling";
  return "cold";
}

export const HEALTH_COLORS: Record<RelationshipHealth, { text: string; bg: string; label: string }> = {
  strong: { text: "text-success", bg: "bg-success/10", label: "Strong" },
  warm: { text: "text-primary", bg: "bg-primary/10", label: "Warm" },
  cooling: { text: "text-warning", bg: "bg-warning/10", label: "Cooling" },
  cold: { text: "text-muted-foreground", bg: "bg-muted/50", label: "Cold" },
  dormant: { text: "text-destructive", bg: "bg-destructive/10", label: "Dormant" },
};

// ── Warm Intro Path Finder (BFS) ──────────────────────────────────────
// Finds shortest path from you to target through your relationship graph
export function findWarmIntroPaths(
  sourceId: string,
  targetId: string,
  edges: RelationshipEdge[],
  nodeNames: Record<string, { name: string; firm?: string | null }>,
  maxHops: number = 3,
): IntroPath[] {
  // Build adjacency list
  const adjacency = new Map<string, { neighbor: string; confidence: number }[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source_id)) adjacency.set(edge.source_id, []);
    if (!adjacency.has(edge.target_id)) adjacency.set(edge.target_id, []);
    adjacency.get(edge.source_id)!.push({ neighbor: edge.target_id, confidence: edge.confidence });
    adjacency.get(edge.target_id)!.push({ neighbor: edge.source_id, confidence: edge.confidence });
  }

  // BFS to find all paths up to maxHops
  const paths: IntroPath[] = [];
  const queue: { node: string; path: string[]; confidences: number[] }[] = [
    { node: sourceId, path: [sourceId], confidences: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.path.length > maxHops + 1) continue;

    if (current.node === targetId && current.path.length > 1) {
      const hops = current.path.map((id) => ({
        id,
        name: nodeNames[id]?.name ?? id,
        firm: nodeNames[id]?.firm ?? null,
      }));
      const avgConfidence = current.confidences.length > 0
        ? current.confidences.reduce((a, b) => a + b, 0) / current.confidences.length
        : 0;
      paths.push({
        hops,
        total_strength: Math.round(avgConfidence * 100),
        path_confidence: Math.round(avgConfidence * 100),
      });
      continue;
    }

    const neighbors = adjacency.get(current.node) ?? [];
    for (const { neighbor, confidence } of neighbors) {
      if (!current.path.includes(neighbor)) {
        queue.push({
          node: neighbor,
          path: [...current.path, neighbor],
          confidences: [...current.confidences, confidence],
        });
      }
    }
  }

  // Sort by confidence (highest first) and limit results
  return paths.sort((a, b) => b.path_confidence - a.path_confidence).slice(0, 5);
}

// ── Contact Segmentation ───────────────────────────────────────────────
export type ContactSegment = "investor" | "operator" | "advisor" | "lp" | "service_provider" | "other";

export function inferSegment(title: string | null, firm: string | null): ContactSegment {
  const t = (title ?? "").toLowerCase();
  const f = (firm ?? "").toLowerCase();

  if (t.includes("partner") || t.includes("principal") || t.includes("managing director") || f.includes("capital") || f.includes("ventures") || f.includes("fund")) {
    return "investor";
  }
  if (t.includes("ceo") || t.includes("cto") || t.includes("coo") || t.includes("founder") || t.includes("vp")) {
    return "operator";
  }
  if (t.includes("advisor") || t.includes("consultant") || t.includes("board")) {
    return "advisor";
  }
  if (t.includes("endowment") || t.includes("pension") || t.includes("family office") || f.includes("endowment") || f.includes("pension")) {
    return "lp";
  }
  if (t.includes("lawyer") || t.includes("attorney") || t.includes("accountant") || f.includes("legal") || f.includes("law")) {
    return "service_provider";
  }
  return "other";
}

export const SEGMENT_LABELS: Record<ContactSegment, { label: string; color: string; bg: string }> = {
  investor: { label: "Investor", color: "text-primary", bg: "bg-primary/10" },
  operator: { label: "Operator", color: "text-chart-4", bg: "bg-chart-4/10" },
  advisor: { label: "Advisor", color: "text-warning", bg: "bg-warning/10" },
  lp: { label: "LP", color: "text-success", bg: "bg-success/10" },
  service_provider: { label: "Service Provider", color: "text-muted-foreground", bg: "bg-muted/50" },
  other: { label: "Other", color: "text-muted-foreground", bg: "bg-muted/50" },
};
