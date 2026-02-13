import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Network, ZoomIn, ZoomOut, Maximize2, Loader2, Zap } from "lucide-react";
import * as d3 from "d3-force";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type GraphNode = {
  id: string;
  label: string;
  type: "company" | "investor" | "person" | "fund";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  confidence: string;
};

const NODE_COLORS: Record<string, string> = {
  company: "hsl(270, 60%, 55%)",
  investor: "hsl(142, 60%, 45%)",
  person: "hsl(38, 92%, 50%)",
  fund: "hsl(200, 70%, 50%)",
};

const NODE_RADIUS: Record<string, number> = {
  company: 8,
  investor: 10,
  person: 6,
  fund: 9,
};

export default function RelationshipGraph({ companyId }: { companyId?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch relationship edges
  const { data: edges, isLoading } = useQuery({
    queryKey: ["relationship-edges", companyId],
    queryFn: async () => {
      let query = supabase.from("relationship_edges").select("*");
      if (companyId) {
        query = query.or(`source_id.eq.${companyId},target_id.eq.${companyId}`);
      }
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Populate relationships mutation
  const { mutate: populateGraph, isPending: isPopulating } = useMutation({
    mutationFn: async () => {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/populate-relationships`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error);
      }
      return resp.json();
    },
    onSuccess: () => {
      toast.success("Relationship graph populated from existing data");
      queryClient.invalidateQueries({ queryKey: ["relationship-edges"] });
    },
    onError: (e: any) => {
      toast.error(`Failed to populate graph: ${e.message}`);
    },
  });

  // Also fetch entity names
  const { data: entities } = useQuery({
    queryKey: ["relationship-entities", edges?.map(e => e.id).join(",")],
    queryFn: async () => {
      if (!edges?.length) return { companies: [], investors: [], personnel: [], funds: [] };
      const ids = new Set<string>();
      edges.forEach(e => { ids.add(e.source_id); ids.add(e.target_id); });
      const idArray = Array.from(ids);

      const [companies, investors, personnel, funds] = await Promise.all([
        supabase.from("companies").select("id, name").in("id", idArray),
        supabase.from("investors").select("id, name").in("id", idArray),
        supabase.from("key_personnel").select("id, name").in("id", idArray),
        supabase.from("funds").select("id, name").in("id", idArray),
      ]);
      return {
        companies: companies.data ?? [],
        investors: investors.data ?? [],
        personnel: personnel.data ?? [],
        funds: funds.data ?? [],
      };
    },
    enabled: !!edges?.length,
  });

  const { nodes, links } = useMemo(() => {
    if (!edges?.length || !entities) return { nodes: [], links: [] };

    const nameMap = new Map<string, { label: string; type: GraphNode["type"] }>();
    entities.companies.forEach(c => nameMap.set(c.id, { label: c.name, type: "company" }));
    entities.investors.forEach(i => nameMap.set(i.id, { label: i.name, type: "investor" }));
    entities.personnel.forEach(p => nameMap.set(p.id, { label: p.name, type: "person" }));
    entities.funds.forEach(f => nameMap.set(f.id, { label: f.name, type: "fund" }));

    const nodeIds = new Set<string>();
    const graphNodes: GraphNode[] = [];
    const graphLinks: GraphLink[] = [];

    edges.forEach(e => {
      [e.source_id, e.target_id].forEach(id => {
        if (!nodeIds.has(id)) {
          nodeIds.add(id);
          const info = nameMap.get(id);
          graphNodes.push({
            id,
            label: info?.label ?? id.slice(0, 8),
            type: info?.type ?? (e.source_id === id ? e.source_type : e.target_type) as GraphNode["type"],
          });
        }
      });
      graphLinks.push({
        source: e.source_id,
        target: e.target_id,
        type: e.relationship_type,
        confidence: e.confidence,
      });
    });

    return { nodes: graphNodes, links: graphLinks };
  }, [edges, entities]);

  // Run D3 simulation
  useEffect(() => {
    if (!nodes.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(links as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[]).id((d: any) => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    simulation.on("tick", () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      // Draw links
      (links as any[]).forEach(link => {
        const source = link.source as GraphNode;
        const target = link.target as GraphNode;
        if (!source.x || !source.y || !target.x || !target.y) return;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = link.confidence === "high" ? "rgba(168, 130, 255, 0.4)" : "rgba(168, 130, 255, 0.15)";
        ctx.lineWidth = link.confidence === "high" ? 1.5 : 0.8;
        ctx.stroke();
      });

      // Draw nodes
      (nodes as GraphNode[]).forEach(node => {
        if (!node.x || !node.y) return;
        const r = NODE_RADIUS[node.type] ?? 7;
        const color = NODE_COLORS[node.type] ?? "#888";

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "10px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(node.label.slice(0, 20), node.x, node.y + r + 12);
      });

      ctx.restore();
    });

    // Mouse interaction
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const node of nodes as GraphNode[]) {
        if (!node.x || !node.y) continue;
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < 144) {
          if (node.type === "company") navigate(`/companies/${node.id}`);
          break;
        }
      }
    };

    canvas.addEventListener("click", handleClick);

    return () => {
      simulation.stop();
      canvas.removeEventListener("click", handleClick);
    };
  }, [nodes, links, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!edges?.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
        <Network className="h-8 w-8 mx-auto text-muted-foreground/30" />
        <div>
          <p className="text-sm text-muted-foreground font-medium">No relationship data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Relationships are auto-discovered from investor, personnel, and deal data</p>
        </div>
        <Button
          onClick={() => populateGraph()}
          disabled={isPopulating}
          variant="outline"
          size="sm"
          className="gap-1.5 mx-auto"
        >
          <Zap className="h-4 w-4" />
          {isPopulating ? "Populating..." : "Populate Graph"}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Relationship Network</h3>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {nodes.length} entities · {links.length} connections
          </span>
        </div>
        <div className="flex items-center gap-2">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full cursor-crosshair"
          style={{ height: 400 }}
        />
      </div>
    </div>
  );
}
