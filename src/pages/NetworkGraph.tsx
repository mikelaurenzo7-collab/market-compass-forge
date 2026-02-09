import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, SimulationNodeDatum, SimulationLinkDatum } from "d3-force";

type GraphNode = SimulationNodeDatum & {
  id: string;
  label: string;
  type: "company" | "investor" | "sector";
  size: number;
  color: string;
};

type GraphLink = SimulationLinkDatum<GraphNode> & {
  value: number;
};

const TYPE_COLORS: Record<string, string> = {
  company: "hsl(192, 91%, 52%)",
  investor: "hsl(142, 60%, 45%)",
  sector: "hsl(38, 92%, 50%)",
};

const NetworkGraph = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);

  const { data: graphData, isLoading } = useQuery({
    queryKey: ["network-graph"],
    queryFn: async () => {
      const [companiesRes, investorsRes, linksRes] = await Promise.all([
        supabase.from("companies").select("id, name, sector, employee_count"),
        supabase.from("investors").select("id, name, aum"),
        supabase.from("investor_company").select("investor_id, company_id"),
      ]);

      const companies = companiesRes.data ?? [];
      const investors = investorsRes.data ?? [];
      const links = linksRes.data ?? [];

      // Build nodes
      const nodes: GraphNode[] = [];
      const companyIds = new Set(links.map((l) => l.company_id));
      const investorIds = new Set(links.map((l) => l.investor_id));

      companies.filter((c) => companyIds.has(c.id)).forEach((c) => {
        nodes.push({
          id: c.id,
          label: c.name,
          type: "company",
          size: Math.max(4, Math.min(12, (c.employee_count ?? 100) / 500)),
          color: TYPE_COLORS.company,
        });
      });

      investors.filter((i) => investorIds.has(i.id)).forEach((i) => {
        nodes.push({
          id: i.id,
          label: i.name,
          type: "investor",
          size: Math.max(6, Math.min(14, (i.aum ?? 1e9) / 5e9)),
          color: TYPE_COLORS.investor,
        });
      });

      // Sector nodes
      const sectors = new Set(companies.filter((c) => companyIds.has(c.id)).map((c) => c.sector).filter(Boolean));
      sectors.forEach((s) => {
        nodes.push({
          id: `sector-${s}`,
          label: s!,
          type: "sector",
          size: 10,
          color: TYPE_COLORS.sector,
        });
      });

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      const graphLinks: GraphLink[] = [];
      links.forEach((l) => {
        if (nodeMap.has(l.investor_id) && nodeMap.has(l.company_id)) {
          graphLinks.push({ source: l.investor_id, target: l.company_id, value: 1 });
        }
      });

      // Company to sector links
      companies.filter((c) => companyIds.has(c.id) && c.sector).forEach((c) => {
        graphLinks.push({ source: c.id, target: `sector-${c.sector}`, value: 0.3 });
      });

      return { nodes, links: graphLinks };
    },
  });

  useEffect(() => {
    if (!graphData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = canvas.offsetHeight * 2;

    const nodes = graphData.nodes.map((n) => ({ ...n }));
    const links = graphData.links.map((l) => ({ ...l }));
    nodesRef.current = nodes;
    linksRef.current = links;

    const sim = forceSimulation(nodes)
      .force("link", forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(80).strength(0.3))
      .force("charge", forceManyBody().strength(-120))
      .force("center", forceCenter(width / 2, height / 2))
      .force("collide", forceCollide().radius((d: any) => d.size * 2 + 5))
      .on("tick", draw);

    function draw() {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(offset.x * 2, offset.y * 2);
      ctx.scale(zoom, zoom);

      // Links
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      links.forEach((l) => {
        const s = l.source as GraphNode;
        const t = l.target as GraphNode;
        if (s.x == null || t.x == null) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y!);
        ctx.lineTo(t.x, t.y!);
        ctx.stroke();
      });

      // Nodes
      nodes.forEach((n) => {
        if (n.x == null) return;
        ctx.beginPath();
        ctx.arc(n.x, n.y!, n.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = n === hoveredNode ? "hsl(192, 91%, 70%)" : n.color;
        ctx.fill();

        if (n.size > 6 || n === hoveredNode) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = `${Math.max(16, n.size * 2)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(n.label, n.x, n.y! + n.size * 2 + 14);
        }
      });

      ctx.restore();
    }

    return () => { sim.stop(); };
  }, [graphData, zoom, offset, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom * 2;
    const y = (e.clientY - rect.top - offset.y) / zoom * 2;

    if (dragging) {
      setOffset({
        x: offset.x + (e.clientX - dragStart.x),
        y: offset.y + (e.clientY - dragStart.y),
      });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const found = nodesRef.current.find((n) => {
      if (n.x == null) return false;
      const dx = n.x - x;
      const dy = n.y! - y;
      return Math.sqrt(dx * dx + dy * dy) < n.size * 3;
    });
    setHoveredNode(found ?? null);
  };

  const handleClick = () => {
    if (hoveredNode?.type === "company") {
      navigate(`/companies/${hoveredNode.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-[600px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Relationship Network</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-primary">{graphData?.nodes.length ?? 0}</span> entities connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 mr-4">
            {Object.entries(TYPE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ background: color }} />
                <span className="text-[11px] text-muted-foreground capitalize">{type}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="p-2 rounded-md border border-border hover:bg-secondary">
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))} className="p-2 rounded-md border border-border hover:bg-secondary">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-2 rounded-md border border-border hover:bg-secondary">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden relative" style={{ height: "600px" }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ cursor: hoveredNode ? "pointer" : dragging ? "grabbing" : "grab" }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onMouseDown={(e) => { setDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); }}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        />
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 px-3 py-2 rounded-md glass border border-border text-sm">
            <span className="font-medium text-foreground">{hoveredNode.label}</span>
            <span className="text-muted-foreground ml-2 capitalize text-xs">{hoveredNode.type}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkGraph;
