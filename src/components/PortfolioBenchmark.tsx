import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Shield, Target, AlertTriangle, BarChart3, Database } from "lucide-react";
import { useMacroIndicators } from "@/hooks/useMacroIndicators";

export type Position = {
  id: string;
  shares: number;
  entry_price: number;
  entry_date: string;
  company_id: string;
  companies?: { name: string; sector: string | null; market_type: string } | null;
  latest_valuation?: number | null;
  funding_rounds?: Array<{ valuation_post: number | null; round_type: string }>;
};

function formatCurrency(val: number) {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function getCurrentPrice(pos: Position): number | null {
  if (pos.latest_valuation) return Number(pos.latest_valuation) / 1e6;
  if (pos.funding_rounds?.[0]?.valuation_post) return Number(pos.funding_rounds[0].valuation_post) / 1e6;
  return null;
}

function calcXIRR(cashflows: { date: Date; amount: number }[]): number {
  // Newton's method for XIRR approximation
  if (cashflows.length < 2) return 0;
  let rate = 0.1;
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0;
    let dnpv = 0;
    const t0 = cashflows[0].date.getTime();
    for (const cf of cashflows) {
      const years = (cf.date.getTime() - t0) / (365.25 * 86400000);
      const factor = Math.pow(1 + rate, years);
      npv += cf.amount / factor;
      dnpv -= years * cf.amount / (factor * (1 + rate));
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < 1e-6) break;
    rate = Math.max(-0.99, Math.min(10, newRate));
  }
  return rate;
}

export default function PortfolioBenchmark({ positions }: { positions: Position[] }) {
  const { data: macroIndicators } = useMacroIndicators();
  const analysis = useMemo(() => {
    if (!positions?.length) return null;

    // Calculate MOIC and IRR per position
    const posMetrics = positions.map(pos => {
      const currentPrice = getCurrentPrice(pos);
      const cost = Number(pos.shares) * Number(pos.entry_price);
      const currentValue = currentPrice !== null ? Number(pos.shares) * currentPrice : cost;
      const moic = cost > 0 ? currentValue / cost : 1;

      // IRR calc
      const cashflows = [
        { date: new Date(pos.entry_date), amount: -cost },
        { date: new Date(), amount: currentValue },
      ];
      const irr = calcXIRR(cashflows);

      return {
        name: pos.companies?.name ?? "Unknown",
        sector: pos.companies?.sector ?? "Unknown",
        marketType: pos.companies?.market_type ?? "private",
        cost,
        currentValue,
        moic,
        irr,
        pnl: currentValue - cost,
        pnlPct: cost > 0 ? ((currentValue - cost) / cost) * 100 : 0,
      };
    });

    // Portfolio-level
    const totalCost = posMetrics.reduce((s, p) => s + p.cost, 0);
    const totalValue = posMetrics.reduce((s, p) => s + p.currentValue, 0);
    const portfolioMOIC = totalCost > 0 ? totalValue / totalCost : 1;

    // Portfolio IRR (aggregate cashflows)
    const allCashflows = positions.flatMap(pos => {
      const currentPrice = getCurrentPrice(pos);
      const cost = Number(pos.shares) * Number(pos.entry_price);
      const currentValue = currentPrice !== null ? Number(pos.shares) * currentPrice : cost;
      return [
        { date: new Date(pos.entry_date), amount: -cost },
        { date: new Date(), amount: currentValue },
      ];
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
    const portfolioIRR = calcXIRR(allCashflows);

    // PME (Private Market Equivalent) — benchmark against expected market return
    const treasuryIndicator = macroIndicators?.find(m => m.series_id === "DGS10");
    // Use 10-year Treasury as risk-free proxy for expected market return
    const treasuryRate = macroIndicators?.find(m => m.series_id === "DGS10");
    // Estimate S&P annual return: historically ~10%, or use treasury + ~5.5% ERP
    const spReturn = treasuryIndicator ? (treasuryIndicator.value / 100 + 0.055) : 0.10;
    
    const pme = positions.reduce((acc, pos) => {
      const cost = Number(pos.shares) * Number(pos.entry_price);
      const years = (Date.now() - new Date(pos.entry_date).getTime()) / (365.25 * 86400000);
      const spEquivalent = cost * Math.pow(1 + spReturn, years);
      return {
        privateValue: acc.privateValue + (getCurrentPrice(pos) !== null ? Number(pos.shares) * getCurrentPrice(pos)! : cost),
        publicEquivalent: acc.publicEquivalent + spEquivalent,
      };
    }, { privateValue: 0, publicEquivalent: 0 });
    const pmeRatio = pme.publicEquivalent > 0 ? pme.privateValue / pme.publicEquivalent : 1;

    // Sector concentration
    const sectorConc = new Map<string, number>();
    posMetrics.forEach(p => {
      sectorConc.set(p.sector, (sectorConc.get(p.sector) ?? 0) + p.currentValue);
    });
    const topSectorPct = totalValue > 0 ? Math.max(...sectorConc.values()) / totalValue : 0;
    const hhi = totalValue > 0
      ? Array.from(sectorConc.values()).reduce((s, v) => s + Math.pow(v / totalValue, 2), 0)
      : 0;

    // Bar chart data
    const moicChartData = posMetrics
      .sort((a, b) => b.moic - a.moic)
      .map(p => ({ name: p.name.slice(0, 15), MOIC: parseFloat(p.moic.toFixed(2)) }));

    return {
      posMetrics,
      totalCost,
      totalValue,
      portfolioMOIC,
      portfolioIRR,
      pmeRatio,
      topSectorPct,
      hhi,
      moicChartData,
      concentrated: topSectorPct > 0.4,
      spReturn,
    };
  }, [positions, macroIndicators]);

  if (!analysis) return null;

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Portfolio MOIC" value={`${analysis.portfolioMOIC.toFixed(2)}x`} icon={<TrendingUp className="h-4 w-4" />} positive={analysis.portfolioMOIC >= 1} />
        <KPI label="Portfolio IRR" value={`${(analysis.portfolioIRR * 100).toFixed(1)}%`} icon={<Target className="h-4 w-4" />} positive={analysis.portfolioIRR >= 0} />
        <KPI label="PME (Benchmark)" value={`${analysis.pmeRatio.toFixed(2)}x`} icon={<BarChart3 className="h-4 w-4" />} positive={analysis.pmeRatio >= 1} sub={`${analysis.pmeRatio >= 1 ? "Outperforming" : "Underperforming"} · ${(analysis.spReturn * 100).toFixed(1)}% benchmark`} />
        <KPI label="Total Cost" value={formatCurrency(analysis.totalCost)} icon={<Shield className="h-4 w-4" />} />
        <KPI label="Current Value" value={formatCurrency(analysis.totalValue)} icon={<TrendingUp className="h-4 w-4" />} positive={analysis.totalValue >= analysis.totalCost} />
      </div>

      {/* Concentration warning */}
      {analysis.concentrated && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-xs text-warning">
            <strong>Concentration Risk:</strong> Top sector represents {(analysis.topSectorPct * 100).toFixed(0)}% of portfolio value. Consider diversifying across sectors.
          </p>
        </div>
      )}

      {/* MOIC Chart */}
      {analysis.moicChartData.length > 1 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">MOIC by Position</h3>
          </div>
          <div className="p-4" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.moicChartData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(222, 20%, 60%)" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(222, 20%, 80%)" }} width={75} />
                <Tooltip
                  contentStyle={{ background: "hsl(222, 44%, 8%)", border: "1px solid hsl(222, 30%, 16%)", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(v: number) => [`${v}x`, "MOIC"]}
                />
                <Bar dataKey="MOIC" fill="hsl(270, 60%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Position detail table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Performance Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Company</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cost</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Value</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">MOIC</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">IRR</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">P&L</th>
              </tr>
            </thead>
            <tbody>
              {analysis.posMetrics.sort((a, b) => b.moic - a.moic).map((p, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-4 py-2.5">
                    <span className="text-foreground font-medium">{p.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      PVT
                    </span>
                  </td>
                  <td className="text-right px-3 py-2.5 font-mono text-muted-foreground">{formatCurrency(p.cost)}</td>
                  <td className="text-right px-3 py-2.5 font-mono text-foreground">{formatCurrency(p.currentValue)}</td>
                  <td className={`text-right px-3 py-2.5 font-mono font-medium ${p.moic >= 1 ? "text-success" : "text-destructive"}`}>
                    {p.moic.toFixed(2)}x
                  </td>
                  <td className={`text-right px-3 py-2.5 font-mono ${p.irr >= 0 ? "text-success" : "text-destructive"}`}>
                    {(p.irr * 100).toFixed(1)}%
                  </td>
                  <td className={`text-right px-3 py-2.5 font-mono ${p.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                    {p.pnl >= 0 ? "+" : ""}{formatCurrency(p.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, sub, icon, positive }: { label: string; value: string; sub?: string; icon: React.ReactNode; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-lg font-semibold font-mono ${positive === true ? "text-success" : positive === false ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className={`text-[10px] mt-0.5 ${positive ? "text-success/70" : "text-destructive/70"}`}>{sub}</div>}
    </div>
  );
}
