import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { Network, X, User, Building2, Landmark, Users, Loader2 } from "lucide-react";

/* ── types ── */
type NodeType = "company" | "person" | "investor" | "firm";

interface GraphNode extends SimulationNodeDatum {
  id: string;
  label: string;
  type: NodeType;
  subtitle?: string;
  background?: string | null;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  relationship: string;
  confidence: string;
}

const NODE_COLORS: Record<NodeType, string> = {
  company: "hsl(270, 60%, 55%)",
  person: "hsl(200, 70%, 55%)",
  investor: "hsl(142, 60%, 45%)",
  firm: "hsl(45, 90%, 55%)",
};

const NODE_RADIUS: Record<NodeType, number> = {
  company: 28,
  person: 18,
  investor: 22,
  firm: 24,
};

const NODE_ICONS: Record<NodeType, typeof Building2> = {
  company: Building2,
  person: User,
  investor: Landmark,
  firm: Users,
};

interface RelationshipGraphProps {
  companyId: string;
  companyName: string;
}

export default function RelationshipGraph({ companyId, companyName }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 360 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [simulatedNodes, setSimulatedNodes] = useState<GraphNode[]>([]);
  const [simulatedLinks, setSimulatedLinks] = useState<GraphLink[]>([]);

  // Fetch key_personnel for this company
  const { data: personnel } = useQuery({
    queryKey: ["key-personnel", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("key_personnel")
        .select("id, name, title, background")
        .eq("company_id", companyId);
      return data ?? [];
    },
  });

  // Fetch investors linked to this company
  const { data: investorLinks } = useQuery({
    queryKey: ["investor-company-links", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("investor_company")
        .select("investor_id, investors(id, name, type)")
        .eq("company_id", companyId);
      return data ?? [];
    },
  });

  // Fetch relationship_edges involving this company
  const { data: edges } = useQuery({
    queryKey: ["relationship-edges", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("relationship_edges")
        .select("*")
        .or(`source_id.eq.${companyId},target_id.eq.${companyId}`);
      return data ?? [];
    },
  });

  // Build graph data
  const { nodes, links } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const linkArr: GraphLink[] = [];

    // Central company node
    nodeMap.set(companyId, {
      id: companyId,
      label: companyName,
      type: "company",
      subtitle: "Target Company",
    });

    // Our firm node
    const firmId = "firm-grapevine";
    nodeMap.set(firmId, {
      id: firmId,
      label: "Our Firm",
      type: "firm",
      subtitle: "Grapevine Capital",
    });
    linkArr.push({
      source: firmId,
      target: companyId,
      relationship: "evaluating",
      confidence: "high",
    });

    // Personnel → nodes + links
    for (const p of personnel ?? []) {
      nodeMap.set(p.id, {
        id: p.id,
        label: p.name,
        type: "person",
        subtitle: p.title,
        background: p.background,
      });
      linkArr.push({
        source: p.id,
        target: companyId,
        relationship: p.title?.toLowerCase().includes("board") ? "board_member" : "executive",
        confidence: "high",
      });
    }

    // Investors → nodes + links
    for (const link of investorLinks ?? []) {
      const inv = (link as any).investors;
      if (!inv) continue;
      nodeMap.set(inv.id, {
        id: inv.id,
        label: inv.name,
        type: "investor",
        subtitle: inv.type ?? "Investor",
      });
      linkArr.push({
        source: inv.id,
        target: companyId,
        relationship: "invested_in",
        confidence: "high",
      });
    }

    // Relationship edges
    for (const edge of edges ?? []) {
      if (!nodeMap.has(edge.source_id)) {
        nodeMap.set(edge.source_id, {
          id: edge.source_id,
          label: edge.source_type,
          type: edge.source_type as NodeType,
          subtitle: edge.relationship_type,
        });
      }
      if (!nodeMap.has(edge.target_id)) {
        nodeMap.set(edge.target_id, {
          id: edge.target_id,
          label: edge.target_type,
          type: edge.target_type as NodeType,
          subtitle: edge.relationship_type,
        });
      }
      // Avoid duplicate links
      const exists = linkArr.some(
        (l) =>
          ((l.source as any)?.id ?? l.source) === edge.source_id &&
          ((l.target as any)?.id ?? l.target) === edge.target_id
      );
      if (!exists) {
        linkArr.push({
          source: edge.source_id,
          target: edge.target_id,
          relationship: edge.relationship_type,
          confidence: edge.confidence,
        });
      }
    }

    return { nodes: Array.from(nodeMap.values()), links: linkArr };
  }, [companyId, companyName, personnel, investorLinks, edges]);

  // Run force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const nodesCopy = nodes.map((n) => ({ ...n }));
    const linksCopy = links.map((l) => ({
      ...l,
      source: typeof l.source === "string" ? l.source : (l.source as any).id,
      target: typeof l.target === "string" ? l.target : (l.target as any).id,
    }));

    const sim = forceSimulation<GraphNode>(nodesCopy)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(linksCopy as any)
          .id((d) => d.id)
          .distance(90)
      )
      .force("charge", forceManyBody().strength(-300))
      .force("center", forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force("collide", forceCollide<GraphNode>().radius((d) => NODE_RADIUS[d.type] + 10));

    sim.on("tick", () => {
      setSimulatedNodes([...nodesCopy]);
      setSimulatedLinks([...(linksCopy as any)]);
    });

    sim.alpha(1).restart();

    return () => {
      sim.stop();
    };
  }, [nodes, links, dimensions]);

  // Responsive sizing
  useEffect(() => {
    const container = svgRef.current?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width: Math.max(400, width), height: 360 });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const relLabel = (r: string) =>
    r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const isLoading = !personnel && !investorLinks;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-center h-48">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (nodes.length <= 1) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
          <Network className="h-4 w-4 text-primary" /> Relationship Graph
        </h3>
        <p className="text-xs text-muted-foreground">
          No relationship data available yet. Enrich this company to populate the network.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" /> Relationship Graph
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {(["company", "person", "investor", "firm"] as NodeType[]).map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: NODE_COLORS[t] }}
              />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
      </div>

      <div className="relative rounded-md border border-border/50 bg-background overflow-hidden" style={{ height: dimensions.height }}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full"
          style={{ cursor: "grab" }}
        >
          {/* Links */}
          {simulatedLinks.map((link, i) => {
            const sx = (link.source as any).x ?? 0;
            const sy = (link.source as any).y ?? 0;
            const tx = (link.target as any).x ?? 0;
            const ty = (link.target as any).y ?? 0;
            const sourceId = (link.source as any).id ?? "";
            const targetId = (link.target as any).id ?? "";
            const isHighlighted =
              hoveredNode === sourceId || hoveredNode === targetId;

            return (
              <g key={i}>
                <line
                  x1={sx}
                  y1={sy}
                  x2={tx}
                  y2={ty}
                  stroke={isHighlighted ? "hsl(270, 60%, 55%)" : "hsl(240, 5%, 25%)"}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeOpacity={hoveredNode && !isHighlighted ? 0.15 : 0.6}
                  strokeDasharray={link.confidence === "medium" ? "4 3" : undefined}
                />
                {isHighlighted && (
                  <text
                    x={(sx + tx) / 2}
                    y={(sy + ty) / 2 - 6}
                    textAnchor="middle"
                    fill="hsl(240, 5%, 70%)"
                    fontSize={9}
                    fontWeight={500}
                  >
                    {relLabel(link.relationship)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {simulatedNodes.map((node) => {
            const r = NODE_RADIUS[node.type];
            const color = NODE_COLORS[node.type];
            const isCenter = node.id === companyId;
            const isHovered = hoveredNode === node.id;
            const dimmed = hoveredNode && !isHovered && !simulatedLinks.some(
              (l) => (l.source as any).id === hoveredNode && (l.target as any).id === node.id ||
                     (l.target as any).id === hoveredNode && (l.source as any).id === node.id
            );
            const Icon = NODE_ICONS[node.type];

            return (
              <g
                key={node.id}
                transform={`translate(${node.x ?? 0},${node.y ?? 0})`}
                style={{ cursor: "pointer", opacity: dimmed ? 0.2 : 1, transition: "opacity 0.2s" }}
                onClick={() => setSelectedNode(node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Glow on hover */}
                {isHovered && (
                  <circle r={r + 6} fill={color} opacity={0.15} />
                )}
                {/* Node circle */}
                <circle
                  r={r}
                  fill={isCenter ? color : "hsl(240, 10%, 10%)"}
                  stroke={color}
                  strokeWidth={isCenter ? 3 : 1.5}
                />
                {/* Icon */}
                <foreignObject
                  x={-r * 0.45}
                  y={-r * 0.45}
                  width={r * 0.9}
                  height={r * 0.9}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <Icon
                      style={{ width: r * 0.55, height: r * 0.55, color: isCenter ? "white" : color }}
                    />
                  </div>
                </foreignObject>
                {/* Label */}
                <text
                  y={r + 14}
                  textAnchor="middle"
                  fill="hsl(240, 5%, 75%)"
                  fontSize={10}
                  fontWeight={isCenter ? 600 : 400}
                >
                  {node.label.length > 16 ? node.label.slice(0, 15) + "…" : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-4 animate-in fade-in-0 slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: NODE_COLORS[selectedNode.type] }}
              />
              <h4 className="text-sm font-semibold text-foreground">{selectedNode.label}</h4>
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                {selectedNode.type}
              </span>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {selectedNode.subtitle && (
            <p className="text-xs text-muted-foreground mb-2">{selectedNode.subtitle}</p>
          )}

          {selectedNode.background && (
            <div className="rounded-md bg-background border border-border/60 p-3 mb-2">
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Background
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed">
                {selectedNode.background}
              </p>
            </div>
          )}

          {/* Show connections */}
          <div>
            <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
              Connections
            </p>
            <div className="space-y-1">
              {simulatedLinks
                .filter(
                  (l) =>
                    (l.source as any).id === selectedNode.id ||
                    (l.target as any).id === selectedNode.id
                )
                .map((l, i) => {
                  const other =
                    (l.source as any).id === selectedNode.id
                      ? (l.target as any)
                      : (l.source as any);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md bg-secondary/30"
                    >
                      <span className="text-foreground font-medium">{other.label}</span>
                      <span className="text-muted-foreground text-[10px]">
                        {relLabel(l.relationship)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
