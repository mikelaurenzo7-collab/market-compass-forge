import { useState, useMemo, useEffect } from "react";
import { useGlobalOpportunities, type GlobalOpportunity } from "@/hooks/useGlobalOpportunities";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GlobalDetailPanel } from "@/components/GlobalDetailPanel";
import { Globe, DollarSign, TrendingUp, ShieldAlert, Filter, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/export";

const RISK_STYLES: Record<string, string> = {
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  very_high: "bg-destructive/10 text-destructive border-destructive/20",
};

const TYPE_LABELS: Record<string, string> = {
  cross_border_ma: "Cross-Border M&A",
  pe_vc: "PE / VC",
  swf_coinvest: "SWF Co-Investment",
  distressed: "Distressed",
  infrastructure: "Infrastructure",
};

const fmt = (v: number | null | undefined) => {
  if (!v) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
};

const REGIONS = ["Emerging Asia", "MENA", "LATAM", "Europe", "Frontier"];

const GlobalMarkets = () => {
  const queryClient = useQueryClient();
  const { data: opportunities, isLoading } = useGlobalOpportunities();

  useEffect(() => {
    const channel = supabase
      .channel('global-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_opportunities' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["global-opportunities"] });
        if (payload.eventType === 'INSERT') {
          toast.info(`New global opportunity: ${(payload.new as any)?.name ?? "Unknown"}`);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<GlobalOpportunity | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    return (opportunities ?? []).filter((o) => {
      if (regionFilter !== "all" && o.region !== regionFilter) return false;
      if (typeFilter !== "all" && o.opportunity_type !== typeFilter) return false;
      if (riskFilter !== "all" && o.risk_rating !== riskFilter) return false;
      if (search && !o.name.toLowerCase().includes(search.toLowerCase()) && !o.country.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [opportunities, regionFilter, typeFilter, riskFilter, search]);

  const activeCount = filtered.filter((o) => o.status === "active").length;
  const avgDeal = filtered.length
    ? filtered.reduce((s, o) => s + (o.deal_value_usd ?? 0), 0) / filtered.filter(o => o.deal_value_usd).length
    : 0;
  const regionBreakdown = REGIONS.map(r => ({
    region: r,
    count: filtered.filter(o => o.region === r).length,
  }));
  const topRegion = regionBreakdown.sort((a, b) => b.count - a.count)[0];

  const handleExport = () => {
    exportToCSV(
      filtered.map((o) => ({
        name: o.name,
        country: o.country,
        region: o.region,
        sector: o.sector ?? "",
        type: TYPE_LABELS[o.opportunity_type] ?? o.opportunity_type,
        deal_value_usd: o.deal_value_usd ?? "",
        risk_rating: o.risk_rating ?? "",
        status: o.status ?? "",
        sovereign_funds: (o.sovereign_fund_interest ?? []).join("; "),
      })),
      "global-opportunities"
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Global Investment Opportunities</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Global Investment Opportunities</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Cross-border M&A, PE/VC, sovereign wealth fund co-investments, and emerging market deals</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="pt-3 flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Total Opportunities</p>
              <p className="text-lg font-bold font-mono">{filtered.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-3 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Avg Deal Size</p>
              <p className="text-lg font-bold font-mono">{fmt(avgDeal)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-3 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Top Region</p>
              <p className="text-lg font-bold">{topRegion?.region ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-3 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Active Deals</p>
              <p className="text-lg font-bold font-mono">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Region mini-bar */}
      <div className="flex gap-2 flex-wrap">
        {REGIONS.map(r => {
          const cnt = (opportunities ?? []).filter(o => o.region === r).length;
          return (
            <button key={r} onClick={() => setRegionFilter(regionFilter === r ? "all" : r)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${regionFilter === r ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
              {r} <span className="font-mono ml-1">({cnt})</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text" placeholder="Search by name or country..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="h-8 px-3 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-56"
          />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="Opportunity Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Risk" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="very_high">Very High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium sticky left-0 bg-muted/30 z-10">Name</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Country</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Region</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sector</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Type</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Deal Value</th>
                <th className="text-center py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Risk</th>
                <th className="text-center py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">SWF Interest</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => { setSelected(o); setDetailOpen(true); }}>
                  <td className="py-2.5 px-3 font-medium text-foreground sticky left-0 bg-card z-10 min-w-[200px]">
                    <p className="text-sm">{o.name}</p>
                    {o.sector && <p className="text-[10px] text-muted-foreground">{o.sector}</p>}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{o.country}</td>
                  <td className="py-2.5 px-3"><Badge variant="outline" className="text-[10px]">{o.region}</Badge></td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{o.sector ?? "—"}</td>
                  <td className="py-2.5 px-3"><Badge variant="secondary" className="text-[10px]">{TYPE_LABELS[o.opportunity_type] ?? o.opportunity_type}</Badge></td>
                  <td className="py-2.5 px-3 text-right font-mono text-sm">{fmt(o.deal_value_usd)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${RISK_STYLES[o.risk_rating ?? "medium"]}`}>
                      {(o.risk_rating ?? "medium").replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border capitalize ${o.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground border-border"}`}>
                      {o.status?.replace("_", " ") ?? "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(o.sovereign_fund_interest ?? []).slice(0, 2).map(f => (
                        <Badge key={f} variant="outline" className="text-[9px]">{f}</Badge>
                      ))}
                      {(o.sovereign_fund_interest ?? []).length > 2 && (
                        <Badge variant="outline" className="text-[9px]">+{(o.sovereign_fund_interest!.length - 2)}</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">No global opportunities match your filters</div>
        )}
      </div>

      <GlobalDetailPanel opportunity={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default GlobalMarkets;
