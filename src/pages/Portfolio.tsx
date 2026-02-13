import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePortfolios, usePortfolioPositions, useCreatePortfolio, useAddPosition, useRemovePosition, useDeletePortfolio, type PortfolioPosition } from "@/hooks/usePortfolio";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Plus, Trash2, TrendingUp, TrendingDown, PieChart, DollarSign, ArrowUpRight, ArrowDownRight, Building2, Search, BarChart3 } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import PortfolioBenchmark from "@/components/PortfolioBenchmark";

const COLORS = [
  "hsl(270, 60%, 55%)", "hsl(142, 60%, 45%)", "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)", "hsl(200, 70%, 50%)", "hsl(340, 65%, 55%)",
  "hsl(170, 55%, 45%)", "hsl(30, 80%, 55%)",
];

function formatCurrency(val: number) {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

function getCurrentPrice(pos: PortfolioPosition): number | null {
  if (pos.public_market_data?.[0]?.price) return Number(pos.public_market_data[0].price);
  if (pos.funding_rounds?.[0]?.valuation_post) return Number(pos.funding_rounds[0].valuation_post) / 1e6; // rough per-share proxy
  return null;
}

const Portfolio = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('portfolio-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio_positions' }, () => {
        queryClient.invalidateQueries({ queryKey: ["portfolio-positions"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  const { data: portfolios, isLoading: loadingPortfolios } = usePortfolios();
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();
  const addPosition = useAddPosition();
  const removePosition = useRemovePosition();

  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(null);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newPos, setNewPos] = useState({ company_id: "", shares: "", entry_price: "", entry_date: new Date().toISOString().split("T")[0], notes: "" });

  const selectedId = activePortfolioId ?? portfolios?.[0]?.id ?? null;
  const { data: positions, isLoading: loadingPositions } = usePortfolioPositions(selectedId);

  // Company search for add position
  const { data: searchResults } = useQuery({
    queryKey: ["company-search-portfolio", searchTerm],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, sector, market_type").ilike("name", `%${searchTerm}%`).limit(8);
      return data ?? [];
    },
    enabled: searchTerm.length >= 2,
  });

  // Portfolio metrics
  const metrics = useMemo(() => {
    if (!positions?.length) return { totalValue: 0, totalCost: 0, totalPnL: 0, pnlPct: 0, dayPnL: 0 };

    let totalValue = 0, totalCost = 0, dayPnL = 0;
    positions.forEach((p) => {
      const cost = Number(p.shares) * Number(p.entry_price);
      totalCost += cost;
      const currentPrice = getCurrentPrice(p);
      if (currentPrice !== null) {
        totalValue += Number(p.shares) * currentPrice;
        const changePct = p.public_market_data?.[0]?.price_change_pct;
        if (changePct) dayPnL += Number(p.shares) * currentPrice * (Number(changePct) / 100);
      } else {
        totalValue += cost; // fallback to cost basis
      }
    });

    return {
      totalValue,
      totalCost,
      totalPnL: totalValue - totalCost,
      pnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      dayPnL,
    };
  }, [positions]);

  // Sector allocation
  const sectorData = useMemo(() => {
    if (!positions?.length) return [];
    const sectorMap = new Map<string, number>();
    positions.forEach((p) => {
      const sector = p.companies?.sector ?? "Unknown";
      const currentPrice = getCurrentPrice(p);
      const value = currentPrice !== null ? Number(p.shares) * currentPrice : Number(p.shares) * Number(p.entry_price);
      sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + value);
    });
    return Array.from(sectorMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [positions]);

  const handleCreatePortfolio = () => {
    const name = prompt("Portfolio name:");
    if (name?.trim()) createPortfolio.mutate(name.trim());
  };

  const handleAddPosition = () => {
    if (!selectedId || !newPos.company_id || !newPos.shares || !newPos.entry_price) return;
    addPosition.mutate({
      portfolio_id: selectedId,
      company_id: newPos.company_id,
      shares: parseFloat(newPos.shares),
      entry_price: parseFloat(newPos.entry_price),
      entry_date: newPos.entry_date,
      notes: newPos.notes || undefined,
    });
    setNewPos({ company_id: "", shares: "", entry_price: "", entry_date: new Date().toISOString().split("T")[0], notes: "" });
    setShowAddPosition(false);
    setSearchTerm("");
  };

  const selectedCompanyName = searchResults?.find((c) => c.id === newPos.company_id)?.name;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Portfolio Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track positions across public & private markets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Portfolio selector */}
          {portfolios && portfolios.length > 0 && (
            <select
              value={selectedId ?? ""}
              onChange={(e) => setActivePortfolioId(e.target.value)}
              className="h-9 px-3 rounded-md border border-border bg-card text-sm text-foreground"
            >
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {positions && positions.length > 0 && (
            <button
              onClick={() => setShowBenchmark(!showBenchmark)}
              className={`h-9 px-3 rounded-md border text-sm transition-colors flex items-center gap-2 ${showBenchmark ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              <BarChart3 className="h-4 w-4" /> Benchmark
            </button>
          )}
          <button onClick={handleCreatePortfolio} className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Portfolio
          </button>
          {selectedId && (
            <button
              onClick={() => { if (confirm("Delete this portfolio and all positions?")) deletePortfolio.mutate(selectedId); }}
              className="h-9 px-3 rounded-md border border-border text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!portfolios?.length && !loadingPortfolios && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-medium text-foreground">No portfolios yet</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first portfolio to start tracking positions</p>
          <button onClick={handleCreatePortfolio} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Portfolio
          </button>
        </div>
      )}

      {selectedId && (
        <>
          {/* Benchmark section */}
          {showBenchmark && positions && positions.length > 0 && (
            <PortfolioBenchmark positions={positions as any} />
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox label="Portfolio Value" value={formatCurrency(metrics.totalValue)} icon={<DollarSign className="h-4 w-4" />} />
            <MetricBox
              label="Total P&L"
              value={`${metrics.totalPnL >= 0 ? "+" : ""}${formatCurrency(metrics.totalPnL)}`}
              sub={`${metrics.pnlPct >= 0 ? "+" : ""}${metrics.pnlPct.toFixed(2)}%`}
              icon={metrics.totalPnL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              positive={metrics.totalPnL >= 0}
            />
            <MetricBox
              label="Day P&L"
              value={`${metrics.dayPnL >= 0 ? "+" : ""}${formatCurrency(metrics.dayPnL)}`}
              icon={metrics.dayPnL >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              positive={metrics.dayPnL >= 0}
            />
            <MetricBox label="Positions" value={String(positions?.length ?? 0)} icon={<Building2 className="h-4 w-4" />} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Positions table */}
            <div className="lg:col-span-2 rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Positions</h2>
                <button
                  onClick={() => setShowAddPosition(!showAddPosition)}
                  className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="h-3 w-3" /> Add Position
                </button>
              </div>

              {showAddPosition && (
                <div className="px-4 py-3 border-b border-border bg-muted/30 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search company..."
                      value={selectedCompanyName ?? searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setNewPos((p) => ({ ...p, company_id: "" })); }}
                      className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    {searchResults && searchResults.length > 0 && !newPos.company_id && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { setNewPos((p) => ({ ...p, company_id: c.id })); setSearchTerm(c.name); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                          >
                            <span className="text-foreground">{c.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{c.market_type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input type="number" placeholder="Shares/Units" value={newPos.shares} onChange={(e) => setNewPos((p) => ({ ...p, shares: e.target.value }))} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" />
                    <input type="number" placeholder="Entry Price" value={newPos.entry_price} onChange={(e) => setNewPos((p) => ({ ...p, entry_price: e.target.value }))} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" />
                    <input type="date" value={newPos.entry_date} onChange={(e) => setNewPos((p) => ({ ...p, entry_date: e.target.value }))} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" />
                    <button onClick={handleAddPosition} disabled={!newPos.company_id || !newPos.shares || !newPos.entry_price} className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left px-4 py-2 font-medium">Company</th>
                      <th className="text-right px-4 py-2 font-medium">Shares</th>
                      <th className="text-right px-4 py-2 font-medium">Entry</th>
                      <th className="text-right px-4 py-2 font-medium">Current</th>
                      <th className="text-right px-4 py-2 font-medium">P&L</th>
                      <th className="text-right px-4 py-2 font-medium">Value</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions?.map((pos) => {
                      const currentPrice = getCurrentPrice(pos);
                      const posValue = currentPrice !== null ? Number(pos.shares) * currentPrice : Number(pos.shares) * Number(pos.entry_price);
                      const pnl = currentPrice !== null ? (currentPrice - Number(pos.entry_price)) * Number(pos.shares) : 0;
                      const pnlPct = Number(pos.entry_price) > 0 && currentPrice !== null ? ((currentPrice - Number(pos.entry_price)) / Number(pos.entry_price)) * 100 : 0;
                      const isPublic = pos.companies?.market_type === "public";

                      return (
                        <tr key={pos.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => navigate(`/companies/${pos.company_id}`)} className="text-foreground hover:text-primary transition-colors font-medium text-left">
                              {pos.companies?.name ?? "Unknown"}
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isPublic ? "bg-chart-2/10 text-success" : "bg-primary/10 text-primary"}`}>
                                {isPublic ? pos.public_market_data?.[0]?.ticker ?? "PUBLIC" : "PRIVATE"}
                              </span>
                              {pos.companies?.sector && <span className="text-[10px] text-muted-foreground">{pos.companies.sector}</span>}
                            </div>
                          </td>
                          <td className="text-right px-4 py-3 font-mono text-foreground">{Number(pos.shares).toLocaleString()}</td>
                          <td className="text-right px-4 py-3 font-mono text-muted-foreground">${Number(pos.entry_price).toFixed(2)}</td>
                          <td className="text-right px-4 py-3 font-mono text-foreground">
                            {currentPrice !== null ? `$${currentPrice.toFixed(2)}` : "—"}
                          </td>
                          <td className={`text-right px-4 py-3 font-mono font-medium ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {currentPrice !== null ? (
                              <div>
                                <div>{pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}</div>
                                <div className="text-[10px]">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%</div>
                              </div>
                            ) : "—"}
                          </td>
                          <td className="text-right px-4 py-3 font-mono text-foreground">{formatCurrency(posValue)}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removePosition.mutate({ id: pos.id, portfolioId: selectedId! })}
                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {(!positions || positions.length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                          No positions yet. Click "Add Position" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sector allocation */}
            <div className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" /> Sector Allocation
                </h2>
              </div>
              <div className="p-4">
                {sectorData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <RechartsPie>
                        <Pie
                          data={sectorData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {sectorData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(222, 44%, 8%)", border: "1px solid hsl(222, 30%, 16%)", borderRadius: "8px", fontSize: "12px" }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {sectorData.map((s, i) => (
                        <div key={s.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-foreground">{s.name}</span>
                          </div>
                          <span className="font-mono text-muted-foreground">{formatCurrency(s.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">Add positions to see allocation</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function MetricBox({ label, value, sub, icon, positive }: { label: string; value: string; sub?: string; icon: React.ReactNode; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-lg font-semibold font-mono ${positive === true ? "text-success" : positive === false ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
      {sub && <div className={`text-xs font-mono mt-0.5 ${positive === true ? "text-success/70" : positive === false ? "text-destructive/70" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}

export default Portfolio;
