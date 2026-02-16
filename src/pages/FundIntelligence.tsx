import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Landmark, Users, Building2, Download, BarChart3 } from "lucide-react";
import DataQualityBanner from "@/components/DataQualityBanner";
import PortfolioBenchmark from "@/components/PortfolioBenchmark";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { exportFundsCSV } from "@/lib/export";

const formatCurrency = (v: number | null) => {
  if (!v) return "—";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
};

const quartileColors: Record<number, string> = {
  1: "text-success",
  2: "text-primary",
  3: "text-warning",
  4: "text-destructive",
};

const FundIntelligence = () => {
  const { user } = useAuth();
  const [fundSearch, setFundSearch] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [lpSearch, setLpSearch] = useState("");

  // Portfolio positions for benchmarking
  const { data: portfolioPositions } = useQuery({
    queryKey: ["portfolio-positions-benchmark", user?.id],
    queryFn: async () => {
      const { data: portfolios } = await supabase
        .from("portfolios")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1);
      if (!portfolios?.length) return [];
      const { data: positions } = await supabase
        .from("portfolio_positions")
        .select("*, companies(name, sector, market_type), public_market_data(price, price_change_pct), funding_rounds(valuation_post, round_type)")
        .eq("portfolio_id", portfolios[0].id);
      return positions ?? [];
    },
    enabled: !!user,
  });

  const { data: funds, isLoading: fundsLoading } = useQuery({
    queryKey: ["funds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("funds").select("*").order("vintage_year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: lps, isLoading: lpsLoading } = useQuery({
    queryKey: ["lp-entities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lp_entities").select("*").order("aum", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const strategies = [...new Set((funds ?? []).map((f) => f.strategy))];

  const filteredFunds = (funds ?? []).filter((f) => {
    if (strategyFilter !== "all" && f.strategy !== strategyFilter) return false;
    if (fundSearch && !f.name.toLowerCase().includes(fundSearch.toLowerCase()) && !f.gp_name.toLowerCase().includes(fundSearch.toLowerCase())) return false;
    return true;
  });

  const filteredLps = (lps ?? []).filter((l) =>
    !lpSearch || l.name.toLowerCase().includes(lpSearch.toLowerCase())
  );

  // GP aggregation
  const gpMap = new Map<string, { name: string; totalAum: number; fundCount: number; strategies: Set<string> }>();
  (funds ?? []).forEach((f) => {
    const gp = gpMap.get(f.gp_name) ?? { name: f.gp_name, totalAum: 0, fundCount: 0, strategies: new Set() };
    gp.totalAum += f.fund_size ?? 0;
    gp.fundCount++;
    gp.strategies.add(f.strategy);
    gpMap.set(f.gp_name, gp);
  });
  const gps = [...gpMap.values()].sort((a, b) => b.totalAum - a.totalAum);

  const totalAum = (funds ?? []).reduce((s, f) => s + (f.fund_size ?? 0), 0);
  const avgIrr = (funds ?? []).reduce((s, f) => s + (f.net_irr ?? 0), 0) / (funds?.length || 1);

  return (
    <PageTransition>
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Fund Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          <span className="font-mono text-primary">{funds?.length ?? 0}</span> funds tracked · {formatCurrency(totalAum)} aggregate AUM
        </p>
      </div>

      {funds && <DataQualityBanner records={funds} category="fund" label="fund" />}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Funds", value: funds?.length ?? 0 },
          { label: "Aggregate AUM", value: formatCurrency(totalAum) },
          { label: "Avg Net IRR", value: `${avgIrr.toFixed(1)}%` },
          { label: "LP Universe", value: lps?.length ?? 0 },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="pt-3 text-center">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold font-mono">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="funds" className="space-y-4">
        <TabsList className="bg-muted/30 border border-border overflow-x-auto">
          <TabsTrigger value="funds" className="gap-1.5 text-xs"><Landmark className="h-3.5 w-3.5" /> Fund Performance</TabsTrigger>
          <TabsTrigger value="lps" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> LP Directory</TabsTrigger>
          <TabsTrigger value="gps" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> GP Profiles</TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" /> Portfolio Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="funds">
           <div className="flex gap-3 mb-4 flex-wrap justify-between">
             <div className="flex gap-3 flex-wrap">
               <Input placeholder="Search funds or GPs..." value={fundSearch} onChange={(e) => setFundSearch(e.target.value)} className="w-64 h-8 text-sm bg-background" />
               <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                 <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Strategies" /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Strategies</SelectItem>
                   {strategies.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <Button
               size="sm"
               variant="outline"
               onClick={() => exportFundsCSV(filteredFunds)}
               className="gap-2"
             >
               <Download className="h-4 w-4" />
               Export CSV
             </Button>
           </div>

          {fundsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Fund Name", "GP", "Vintage", "Strategy", "Fund Size", "Net IRR", "TVPI", "DPI", "Quartile"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFunds.map((f) => (
                        <tr key={f.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 px-3 text-xs font-medium">{f.name}</td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{f.gp_name}</td>
                          <td className="py-2 px-3 font-mono text-xs">{f.vintage_year}</td>
                          <td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{f.strategy}</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">{formatCurrency(f.fund_size)}</td>
                          <td className="py-2 px-3 font-mono text-xs text-primary">{f.net_irr ? `${f.net_irr}%` : "—"}</td>
                          <td className="py-2 px-3 font-mono text-xs">{f.tvpi ? `${f.tvpi}x` : "—"}</td>
                          <td className="py-2 px-3 font-mono text-xs">{f.dpi ? `${f.dpi}x` : "—"}</td>
                          <td className={`py-2 px-3 font-mono text-xs font-bold ${quartileColors[f.quartile ?? 3]}`}>
                            Q{f.quartile ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lps">
          <div className="mb-4">
            <Input placeholder="Search LPs..." value={lpSearch} onChange={(e) => setLpSearch(e.target.value)} className="w-64 h-8 text-sm bg-background" />
          </div>
          {lpsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Name", "Type", "AUM", "Strategies", "HQ"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLps.map((l) => (
                        <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-2 px-3 text-xs font-medium">{l.name}</td>
                          <td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{l.type}</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">{formatCurrency(l.aum)}</td>
                          <td className="py-2 px-3 text-xs">
                            <div className="flex flex-wrap gap-1">
                              {(l.strategies ?? []).map((s: string) => (
                                <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground">{l.hq_city}, {l.hq_country}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gps">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["GP Name", "Total AUM", "# Funds", "Strategies"].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gps.map((gp) => (
                      <tr key={gp.name} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2 px-3 text-xs font-medium">{gp.name}</td>
                        <td className="py-2 px-3 font-mono text-xs">{formatCurrency(gp.totalAum)}</td>
                        <td className="py-2 px-3 font-mono text-xs">{gp.fundCount}</td>
                        <td className="py-2 px-3 text-xs">
                          <div className="flex flex-wrap gap-1">
                            {[...gp.strategies].map((s) => (
                              <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmark">
          {portfolioPositions && portfolioPositions.length > 0 ? (
            <PortfolioBenchmark positions={portfolioPositions as any} />
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="py-12 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">No portfolio positions yet</p>
                <p className="text-xs text-muted-foreground/70">Add companies to your portfolio to see MOIC, IRR, and PME benchmarks.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </PageTransition>
  );
};

export default FundIntelligence;
