import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePublicMarketLeaders, usePublicMarketMovers, formatCurrency } from "@/hooks/useData";
import { TrendingUp, TrendingDown, BarChart3, Activity, Globe, Building2, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PublicMarkets = () => {
  const navigate = useNavigate();
  const { data: leaders, isLoading: leadersLoading } = usePublicMarketLeaders();
  const { data: movers, isLoading: moversLoading } = usePublicMarketMovers();

  const { data: sectorPerf } = useQuery({
    queryKey: ["public-sector-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_market_data")
        .select("price_change_pct, companies(sector)")
        .not("price_change_pct", "is", null);
      if (error) throw error;
      const bySector: Record<string, { total: number; count: number }> = {};
      (data ?? []).forEach((d: any) => {
        const sector = d.companies?.sector ?? "Other";
        if (!bySector[sector]) bySector[sector] = { total: 0, count: 0 };
        bySector[sector].total += d.price_change_pct ?? 0;
        bySector[sector].count++;
      });
      return Object.entries(bySector)
        .map(([sector, { total, count }]) => ({ sector, avgChange: total / count }))
        .sort((a, b) => b.avgChange - a.avgChange);
    },
  });

  const { data: marketSummary } = useQuery({
    queryKey: ["public-market-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_market_data")
        .select("market_cap, price_change_pct")
        .not("market_cap", "is", null);
      if (error) throw error;
      const totalMarketCap = (data ?? []).reduce((s, d) => s + (d.market_cap ?? 0), 0);
      const avgChange = (data ?? []).reduce((s, d) => s + (d.price_change_pct ?? 0), 0) / (data?.length || 1);
      const gainers = (data ?? []).filter(d => (d.price_change_pct ?? 0) > 0).length;
      return { totalMarketCap, avgChange, totalCompanies: data?.length ?? 0, gainers, decliners: (data?.length ?? 0) - gainers };
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Public Markets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time market intelligence across global exchanges</p>
      </div>

      {/* Market Summary */}
      {marketSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Total Market Cap" value={formatCurrency(marketSummary.totalMarketCap)} />
          <SummaryCard label="Companies Tracked" value={String(marketSummary.totalCompanies)} />
          <SummaryCard label="Avg. Change" value={`${marketSummary.avgChange >= 0 ? "+" : ""}${marketSummary.avgChange.toFixed(2)}%`} positive={marketSummary.avgChange >= 0} />
          <SummaryCard label="Gainers / Decliners" value={`${marketSummary.gainers} / ${marketSummary.decliners}`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Gainers */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-foreground">Top Gainers</h3>
          </div>
          {moversLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <div className="divide-y divide-border/50">
              {movers?.gainers.map((g: any) => (
                <div key={g.id} onClick={() => navigate(`/companies/${g.company_id}`)} className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-12">{g.ticker}</span>
                    <span className="text-sm font-medium text-foreground">{g.companies?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-foreground">${g.price?.toFixed(2)}</span>
                    <span className="text-sm font-mono font-medium text-green-500">+{g.price_change_pct?.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Decliners */}
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">Top Decliners</h3>
          </div>
          {moversLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : (
            <div className="divide-y divide-border/50">
              {movers?.losers.map((g: any) => (
                <div key={g.id} onClick={() => navigate(`/companies/${g.company_id}`)} className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-12">{g.ticker}</span>
                    <span className="text-sm font-medium text-foreground">{g.companies?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-foreground">${g.price?.toFixed(2)}</span>
                    <span className="text-sm font-mono font-medium text-red-500">{g.price_change_pct?.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sector Performance */}
      {sectorPerf && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Sector Performance</h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sectorPerf.map((s) => (
              <div key={s.sector} className="rounded-md border border-border p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{s.sector}</p>
                <p className={`text-sm font-mono font-medium mt-1 ${s.avgChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {s.avgChange >= 0 ? "+" : ""}{s.avgChange.toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Leaders Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Market Leaders by Market Cap</h3>
        </div>
        {leadersLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-data">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Company</th>
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Ticker</th>
                  <th className="text-left px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sector</th>
                  <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Market Cap</th>
                  <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Price</th>
                  <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Change</th>
                  <th className="text-right px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">P/E</th>
                </tr>
              </thead>
              <tbody>
                {leaders?.map((l: any) => {
                  const isPositive = (l.price_change_pct ?? 0) >= 0;
                  return (
                    <tr key={l.id} onClick={() => navigate(`/companies/${l.company_id}`)} className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-accent flex items-center justify-center shrink-0">
                            <Building2 className="h-3 w-3 text-accent-foreground" />
                          </div>
                          <span className="text-foreground font-medium">{l.companies?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{l.ticker}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.companies?.sector ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground">{formatCurrency(l.market_cap)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-foreground">${l.price?.toFixed(2)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
                        {isPositive ? "+" : ""}{l.price_change_pct?.toFixed(2)}%
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{l.pe_ratio?.toFixed(1) ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className={`text-xl font-bold font-mono mt-1 ${positive === true ? "text-green-500" : positive === false ? "text-red-500" : "text-foreground"}`}>
      {value}
    </p>
  </div>
);

export default PublicMarkets;
