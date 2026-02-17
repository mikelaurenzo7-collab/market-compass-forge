import { useState } from "react";
import { Activity, Zap } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import MacroImpactMatrix from "@/components/MacroImpactMatrix";
import { useSectorMomentum } from "@/hooks/useSectorMomentum";
import { useGenerateAlphaSignals } from "@/hooks/useAlphaSignals";
import { formatCurrency } from "@/hooks/useData";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus, RefreshCw, BarChart3, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import ConfidenceBadge from "@/components/ConfidenceBadge";

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-foreground">
          {p.name}: <span className="text-primary">{typeof p.value === "number" ? (p.value > 1e6 ? `$${(p.value / 1e6).toFixed(0)}M` : p.value.toFixed(1)) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const DirectionIcon = ({ direction }: { direction: string }) => {
  if (direction === "bullish") return <ArrowUpRight className="h-4 w-4 text-primary" />;
  if (direction === "bearish") return <ArrowDownRight className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const SectorPulse = () => {
  const [tab, setTab] = useState<"momentum" | "macro">("momentum");
  const { data, isLoading } = useSectorMomentum();
  const generateSignals = useGenerateAlphaSignals();
  const [view, setView] = useState<"flows" | "rotation">("flows");

  const flows = data?.flows ?? [];
  const gaining = data?.gaining ?? [];
  const declining = data?.declining ?? [];

  const capitalChart = flows.slice(0, 10).map((f) => ({
    sector: f.sector.length > 15 ? f.sector.slice(0, 13) + "…" : f.sector,
    capital: f.totalCapital,
    deals: f.dealCount,
  }));

  const hasData = flows.length > 0;

  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">Intelligence</span>
            </div>
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Sector Pulse
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Capital flows, rotation patterns, and macro impact analysis
            </p>
          </div>
          {tab === "momentum" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSignals.mutate()}
              disabled={generateSignals.isPending}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generateSignals.isPending ? "animate-spin" : ""}`} />
              Refresh Signals
            </Button>
          )}
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border w-fit">
          <button
            onClick={() => setTab("momentum")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === "momentum" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Momentum
          </button>
          <button
            onClick={() => setTab("macro")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === "macro" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            Macro Impact
          </button>
        </div>

        {tab === "macro" ? (
          <MacroImpactMatrix />
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 h-72 animate-pulse" />
            <div className="rounded-lg border border-border bg-card p-4 h-48 animate-pulse" />
          </div>
        ) : !hasData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-dashed border-border bg-card p-12 text-center space-y-4"
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">No Sector Data Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Sector momentum requires funding round data. Add companies and their funding history to start tracking capital flows.
              </p>
            </div>
            <Button variant="outline" onClick={() => generateSignals.mutate()} disabled={generateSignals.isPending} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${generateSignals.isPending ? "animate-spin" : ""}`} />
              Generate AI Signals
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {/* Sub-toggle for momentum view */}
            <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border w-fit">
              <button
                onClick={() => setView("flows")}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === "flows" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Capital Flows
              </button>
              <button
                onClick={() => setView("rotation")}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === "rotation" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Rotation Map
              </button>
            </div>

            {view === "flows" ? (
              <>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Capital Flow by Sector (6mo)</h3>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Info className="h-3 w-3" />
                      Based on {flows.reduce((sum, f) => sum + f.dealCount, 0)} deals
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={Math.max(180, flows.length * 40)}>
                    <BarChart data={capitalChart} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`} />
                      <YAxis type="category" dataKey="sector" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={80} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="capital" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Capital" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="text-left px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sector</th>
                          <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Deals</th>
                          <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Capital</th>
                          <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Avg Deal</th>
                          <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Trend</th>
                          <th className="text-center px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">AI Signal</th>
                          <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sentiment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flows.map((f, i) => (
                          <motion.tr
                            key={f.sector}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">{f.sector}</td>
                            <td className="px-4 py-3 text-right font-mono text-foreground">{f.dealCount}</td>
                            <td className="px-4 py-3 text-right font-mono text-foreground">{f.totalCapital > 0 ? formatCurrency(f.totalCapital) : "—"}</td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">{f.avgDealSize > 0 ? formatCurrency(f.avgDealSize) : "—"}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-mono text-xs font-medium ${f.trend > 0 ? "text-primary" : f.trend < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                {f.trend > 0 ? "+" : ""}{f.trend.toFixed(0)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <DirectionIcon direction={f.signalDirection} />
                                <span className="text-xs font-mono">
                                  {f.signalMagnitude > 0 ? `${f.signalMagnitude.toFixed(1)}%` : "—"}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className={`h-2 w-2 rounded-full ${f.sentimentScore > 0.3 ? "bg-primary" : f.sentimentScore < -0.3 ? "bg-destructive" : "bg-muted-foreground"}`} />
                                <span className="text-xs font-mono text-muted-foreground">{f.sentimentScore.toFixed(2)}</span>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-lg border border-primary/20 bg-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Capital Inflows</h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">6mo vs prior 6mo</span>
                  </div>
                  <div className="space-y-3">
                    {gaining.length === 0 && (
                      <div className="text-center py-8 space-y-2">
                        <TrendingUp className="h-8 w-8 text-muted-foreground/20 mx-auto" />
                        <p className="text-sm text-muted-foreground">No significant inflows detected</p>
                      </div>
                    )}
                    {gaining.map((s, i) => (
                      <motion.div key={s.sector} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                          <ArrowUpRight className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{s.sector}</p>
                          <p className="text-[10px] text-muted-foreground">{s.dealCount} deals · {formatCurrency(s.totalCapital)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-primary">+{s.trend.toFixed(0)}%</p>
                          <div className="flex items-center gap-1 justify-end">
                            <DirectionIcon direction={s.signalDirection} />
                            <ConfidenceBadge level={s.confidence} compact />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-destructive/20 bg-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="h-4 w-4 text-destructive" />
                    <h3 className="text-sm font-semibold text-foreground">Capital Outflows</h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">6mo vs prior 6mo</span>
                  </div>
                  <div className="space-y-3">
                    {declining.length === 0 && (
                      <div className="text-center py-8 space-y-2">
                        <TrendingDown className="h-8 w-8 text-muted-foreground/20 mx-auto" />
                        <p className="text-sm text-muted-foreground">No significant outflows detected</p>
                      </div>
                    )}
                    {declining.map((s, i) => (
                      <motion.div key={s.sector} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-md border border-border hover:border-destructive/30 transition-colors"
                      >
                        <div className="h-8 w-8 rounded-md bg-destructive/10 flex items-center justify-center">
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{s.sector}</p>
                          <p className="text-[10px] text-muted-foreground">{s.dealCount} deals · {formatCurrency(s.totalCapital)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-destructive">{s.trend.toFixed(0)}%</p>
                          <div className="flex items-center gap-1 justify-end">
                            <DirectionIcon direction={s.signalDirection} />
                            <ConfidenceBadge level={s.confidence} compact />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Rotation Analysis</h3>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-2">
                    {gaining.length > 0 && declining.length > 0 ? (
                      <>
                        <p>Capital is rotating <span className="text-primary font-medium">into {gaining.slice(0, 3).map(g => g.sector).join(", ")}</span> and <span className="text-destructive font-medium">out of {declining.slice(0, 3).map(d => d.sector).join(", ")}</span>.</p>
                        <p>The strongest inflow is <span className="text-foreground font-medium">{gaining[0]?.sector}</span> at <span className="text-primary font-mono">+{gaining[0]?.trend.toFixed(0)}%</span> capital growth.</p>
                      </>
                    ) : gaining.length > 0 ? (
                      <p>Capital is flowing <span className="text-primary font-medium">into {gaining.slice(0, 3).map(g => g.sector).join(", ")}</span>. Not enough data for outflow patterns yet.</p>
                    ) : (
                      <p>Not enough historical data to detect clear rotation patterns yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
};

export default SectorPulse;
