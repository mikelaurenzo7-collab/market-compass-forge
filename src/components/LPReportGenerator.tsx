import { useState, useMemo, useRef, useCallback } from "react";
import { FileText, Download, X, Loader2, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";

type PositionData = {
  companyName: string;
  sector: string;
  shares: number;
  entryPrice: number;
  entryDate: string;
  currentPrice: number | null;
  thesis: string | null;
  stage: string | null;
  decisionHistory: Array<{ type: string; rationale: string | null; date: string; toState: string | null }>;
};

interface LPReportGeneratorProps {
  portfolioName: string;
  positions: PositionData[];
  totalValue: number;
  totalCost: number;
  portfolioMOIC?: number;
  portfolioIRR?: number;
  onClose: () => void;
}

function formatCurrency(val: number) {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

// Thesis Drift: compare entry assumptions to current performance
function computeThesisDrift(pos: PositionData) {
  const currentPrice = pos.currentPrice ?? pos.entryPrice;
  const returnPct = pos.entryPrice > 0 ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;

  // Simulate drift dimensions based on available data
  const holdingDays = Math.max(1, Math.floor((Date.now() - new Date(pos.entryDate).getTime()) / 86400000));
  const annualizedReturn = (Math.pow(1 + returnPct / 100, 365 / holdingDays) - 1) * 100;

  // Score dimensions 0-100 (100 = on thesis, 0 = fully drifted)
  const valuationScore = Math.max(0, Math.min(100, 50 + returnPct * 2)); // centered at 50 for breakeven
  const momentumScore = annualizedReturn > 20 ? 90 : annualizedReturn > 0 ? 60 : annualizedReturn > -10 ? 35 : 15;
  const timelineScore = holdingDays < 365 ? 85 : holdingDays < 730 ? 65 : holdingDays < 1095 ? 45 : 25;
  const convictionScore = pos.decisionHistory.length > 2 ? 80 : pos.decisionHistory.length > 0 ? 60 : 40;
  const stageScore = pos.stage === "committed" ? 90 : pos.stage === "ic_review" ? 70 : pos.stage === "passed" ? 20 : 50;

  return {
    companyName: pos.companyName,
    returnPct,
    annualizedReturn,
    holdingDays,
    dimensions: [
      { metric: "Valuation", score: valuationScore, baseline: 50 },
      { metric: "Momentum", score: momentumScore, baseline: 50 },
      { metric: "Timeline", score: timelineScore, baseline: 50 },
      { metric: "Conviction", score: convictionScore, baseline: 50 },
      { metric: "Stage", score: stageScore, baseline: 50 },
    ],
    overallDrift: Math.abs(50 - (valuationScore + momentumScore + timelineScore + convictionScore + stageScore) / 5),
  };
}

export default function LPReportGenerator({ portfolioName, positions, totalValue, totalCost, portfolioMOIC, portfolioIRR, onClose }: LPReportGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const driftData = useMemo(() => positions.map(computeThesisDrift), [positions]);

  // Bar chart: return by position
  const returnChartData = useMemo(() => {
    return positions.map((pos) => {
      const currentPrice = pos.currentPrice ?? pos.entryPrice;
      const returnPct = pos.entryPrice > 0 ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;
      return {
        name: pos.companyName.length > 12 ? pos.companyName.slice(0, 12) + "…" : pos.companyName,
        return: parseFloat(returnPct.toFixed(1)),
      };
    }).sort((a, b) => b.return - a.return);
  }, [positions]);

  const handleExportPDF = useCallback(() => {
    if (!reportRef.current) return;
    setGenerating(true);

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setGenerating(false);
      return;
    }

    const content = reportRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${portfolioName} — LP Update</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            background: #0a0a0f; color: #e4e4e7; line-height: 1.5; padding: 24px;
          }
          .report-header { border-bottom: 1px solid #27272a; padding-bottom: 20px; margin-bottom: 24px; }
          .report-header h1 { font-size: 20px; font-weight: 700; color: #fafafa; letter-spacing: -0.02em; }
          .report-header p { font-size: 11px; color: #71717a; margin-top: 4px; }
          .report-header .badge { display: inline-block; font-size: 9px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; background: #18181b; border: 1px solid #27272a; color: #a1a1aa; margin-top: 8px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .metric-card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; }
          .metric-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; font-weight: 600; }
          .metric-card .value { font-size: 22px; font-weight: 700; font-family: 'SF Mono', 'Fira Code', monospace; margin-top: 4px; }
          .metric-card .value.positive { color: #4ade80; }
          .metric-card .value.negative { color: #f87171; }
          .metric-card .value.neutral { color: #fafafa; }
          .section { margin-bottom: 24px; }
          .section h2 { font-size: 13px; font-weight: 700; color: #fafafa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #27272a; }
          .position-card { background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
          .position-card .name { font-size: 14px; font-weight: 600; color: #fafafa; }
          .position-card .sector { font-size: 10px; color: #71717a; margin-top: 2px; }
          .position-card .thesis-box { background: #0a0a0f; border: 1px solid #27272a; border-radius: 6px; padding: 12px; margin-top: 12px; }
          .position-card .thesis-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a; font-weight: 600; margin-bottom: 4px; }
          .position-card .thesis-text { font-size: 12px; color: #a1a1aa; line-height: 1.6; }
          .position-metrics { display: flex; gap: 16px; margin-top: 12px; }
          .position-metrics .pm { text-align: center; }
          .position-metrics .pm .pm-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
          .position-metrics .pm .pm-value { font-size: 16px; font-weight: 700; font-family: monospace; margin-top: 2px; }
          .drift-indicator { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 8px 12px; border-radius: 6px; font-size: 11px; font-weight: 500; }
          .drift-low { background: rgba(74, 222, 128, 0.1); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.2); }
          .drift-med { background: rgba(250, 204, 21, 0.1); color: #facc15; border: 1px solid rgba(250, 204, 21, 0.2); }
          .drift-high { background: rgba(248, 113, 113, 0.1); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.2); }
          .timeline-entry { font-size: 11px; color: #a1a1aa; padding: 6px 0; border-bottom: 1px solid #1a1a1f; }
          .timeline-entry:last-child { border-bottom: none; }
          .timeline-date { font-size: 10px; color: #52525b; font-family: monospace; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #27272a; text-align: center; }
          .footer p { font-size: 9px; color: #52525b; letter-spacing: 0.03em; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      setGenerating(false);
    }, 500);
  }, [portfolioName]);

  const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const quarterLabel = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8">
      <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl mx-4">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">LP Update Report</h2>
              <p className="text-[10px] text-muted-foreground">{quarterLabel} · {positions.length} positions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={generating}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Export PDF
            </button>
            <button onClick={onClose} className="h-9 w-9 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Report preview */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Thesis Drift Chart (in-app only — interactive) */}
          {driftData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-primary" /> Thesis Drift Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Return chart */}
                <div className="rounded-lg border border-border bg-background p-4" style={{ height: 240 }}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Return by Position</p>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={returnChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 5%, 15%)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(240, 5%, 50%)" }} tickFormatter={(v) => `${v}%`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(240, 5%, 70%)" }} width={75} />
                      <Tooltip
                        contentStyle={{ background: "hsl(240, 10%, 6%)", border: "1px solid hsl(240, 5%, 15%)", borderRadius: "6px", fontSize: "11px" }}
                        formatter={(v: number) => [`${v}%`, "Return"]}
                      />
                      <ReferenceLine x={0} stroke="hsl(240, 5%, 30%)" strokeDasharray="3 3" />
                      <Bar dataKey="return" radius={[0, 4, 4, 0]}>
                        {returnChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.return >= 0 ? "hsl(142, 60%, 45%)" : "hsl(0, 72%, 51%)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Drift radar for top position */}
                {driftData[0] && (
                  <div className="rounded-lg border border-border bg-background p-4" style={{ height: 240 }}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
                      Drift Radar · {driftData[0].companyName}
                    </p>
                    <ResponsiveContainer width="100%" height="85%">
                      <RadarChart data={driftData[0].dimensions}>
                        <PolarGrid stroke="hsl(240, 5%, 15%)" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(240, 5%, 60%)" }} />
                        <Radar name="Current" dataKey="score" stroke="hsl(270, 60%, 55%)" fill="hsl(270, 60%, 55%)" fillOpacity={0.25} />
                        <Radar name="Baseline" dataKey="baseline" stroke="hsl(240, 5%, 30%)" fill="transparent" strokeDasharray="4 4" />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Drift summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                {driftData.map((d) => {
                  const driftLevel = d.overallDrift < 10 ? "low" : d.overallDrift < 25 ? "med" : "high";
                  return (
                    <div key={d.companyName} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">{d.companyName}</span>
                        <span className={`text-[10px] font-mono font-semibold ${d.returnPct >= 0 ? "text-success" : "text-destructive"}`}>
                          {d.returnPct >= 0 ? "+" : ""}{d.returnPct.toFixed(1)}%
                        </span>
                      </div>
                      <div className={`mt-1.5 flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md w-fit ${
                        driftLevel === "low" ? "bg-success/10 text-success" :
                        driftLevel === "med" ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      }`}>
                        {driftLevel === "low" ? <TrendingUp className="h-3 w-3" /> :
                         driftLevel === "med" ? <Target className="h-3 w-3" /> :
                         <AlertTriangle className="h-3 w-3" />}
                        {driftLevel === "low" ? "On Thesis" : driftLevel === "med" ? "Moderate Drift" : "Significant Drift"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Printable report content (hidden structure for PDF) */}
          <div ref={reportRef} className="hidden">
            <div className="report-header">
              <h1>{portfolioName} — LP Update</h1>
              <p>{currentDate}</p>
              <span className="badge">{quarterLabel} · Confidential</span>
            </div>

            <div className="metrics-grid">
              <div className="metric-card">
                <div className="label">Portfolio Value</div>
                <div className="value neutral">{formatCurrency(totalValue)}</div>
              </div>
              <div className="metric-card">
                <div className="label">Total P&L</div>
                <div className={`value ${totalPnL >= 0 ? "positive" : "negative"}`}>
                  {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)} ({totalPnLPct >= 0 ? "+" : ""}{totalPnLPct.toFixed(1)}%)
                </div>
              </div>
              <div className="metric-card">
                <div className="label">Portfolio MOIC</div>
                <div className={`value ${(portfolioMOIC ?? 1) >= 1 ? "positive" : "negative"}`}>{(portfolioMOIC ?? 1).toFixed(2)}x</div>
              </div>
              <div className="metric-card">
                <div className="label">Portfolio IRR</div>
                <div className={`value ${(portfolioIRR ?? 0) >= 0 ? "positive" : "negative"}`}>{((portfolioIRR ?? 0) * 100).toFixed(1)}%</div>
              </div>
            </div>

            <div className="section">
              <h2>Portfolio Positions</h2>
              {positions.map((pos) => {
                const drift = computeThesisDrift(pos);
                const driftLevel = drift.overallDrift < 10 ? "low" : drift.overallDrift < 25 ? "med" : "high";
                const currentPrice = pos.currentPrice ?? pos.entryPrice;
                const returnPct = pos.entryPrice > 0 ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;
                const moic = pos.entryPrice > 0 ? currentPrice / pos.entryPrice : 1;

                return (
                  <div key={pos.companyName} className="position-card">
                    <div className="name">{pos.companyName}</div>
                    <div className="sector">{pos.sector} · {pos.stage ?? "Active"}</div>

                    <div className="position-metrics">
                      <div className="pm">
                        <div className="pm-label">Entry</div>
                        <div className="pm-value" style={{ color: "#a1a1aa" }}>${pos.entryPrice.toFixed(2)}</div>
                      </div>
                      <div className="pm">
                        <div className="pm-label">Current</div>
                        <div className="pm-value" style={{ color: "#fafafa" }}>${currentPrice.toFixed(2)}</div>
                      </div>
                      <div className="pm">
                        <div className="pm-label">Return</div>
                        <div className="pm-value" style={{ color: returnPct >= 0 ? "#4ade80" : "#f87171" }}>
                          {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(1)}%
                        </div>
                      </div>
                      <div className="pm">
                        <div className="pm-label">MOIC</div>
                        <div className="pm-value" style={{ color: moic >= 1 ? "#4ade80" : "#f87171" }}>{moic.toFixed(2)}x</div>
                      </div>
                    </div>

                    <div className={`drift-indicator drift-${driftLevel}`}>
                      {driftLevel === "low" ? "✓ On Thesis" : driftLevel === "med" ? "⚠ Moderate Drift" : "⚠ Significant Drift"}
                      {` — ${drift.holdingDays}d hold, ${drift.annualizedReturn.toFixed(1)}% annualized`}
                    </div>

                    {pos.thesis && (
                      <div className="thesis-box">
                        <div className="thesis-label">Original Investment Thesis</div>
                        <div className="thesis-text">{pos.thesis}</div>
                      </div>
                    )}

                    {pos.decisionHistory.length > 0 && (
                      <div className="thesis-box" style={{ marginTop: 8 }}>
                        <div className="thesis-label">Decision Journal</div>
                        {pos.decisionHistory.slice(0, 5).map((d, i) => (
                          <div key={i} className="timeline-entry">
                            <span className="timeline-date">{new Date(d.date).toLocaleDateString()}</span>
                            {" — "}{d.type}{d.toState ? ` → ${d.toState}` : ""}
                            {d.rationale && <span style={{ display: "block", marginTop: 2 }}>{d.rationale}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="footer">
              <p>Generated by Grapevine · {currentDate} · Confidential — For Limited Partner Distribution Only</p>
            </div>
          </div>

          {/* Visible preview of report sections */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Report Preview</h3>
                <span className="text-[10px] text-muted-foreground font-mono">{currentDate}</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-md bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Value</p>
                  <p className="text-sm font-bold font-mono text-foreground mt-1">{formatCurrency(totalValue)}</p>
                </div>
                <div className="text-center p-3 rounded-md bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">P&L</p>
                  <p className={`text-sm font-bold font-mono mt-1 ${totalPnL >= 0 ? "text-success" : "text-destructive"}`}>
                    {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)}
                  </p>
                </div>
                <div className="text-center p-3 rounded-md bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">MOIC</p>
                  <p className={`text-sm font-bold font-mono mt-1 ${(portfolioMOIC ?? 1) >= 1 ? "text-success" : "text-destructive"}`}>
                    {(portfolioMOIC ?? 1).toFixed(2)}x
                  </p>
                </div>
                <div className="text-center p-3 rounded-md bg-secondary/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">IRR</p>
                  <p className={`text-sm font-bold font-mono mt-1 ${(portfolioIRR ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                    {((portfolioIRR ?? 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Position summaries */}
            {positions.map((pos) => {
              const drift = computeThesisDrift(pos);
              const driftLevel = drift.overallDrift < 10 ? "low" : drift.overallDrift < 25 ? "med" : "high";
              return (
                <div key={pos.companyName} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{pos.companyName}</p>
                      <p className="text-[10px] text-muted-foreground">{pos.sector} · {pos.stage ?? "Active"}</p>
                    </div>
                    <div className={`text-[10px] font-medium px-2 py-1 rounded-md ${
                      driftLevel === "low" ? "bg-success/10 text-success" :
                      driftLevel === "med" ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    }`}>
                      {driftLevel === "low" ? "On Thesis" : driftLevel === "med" ? "Moderate Drift" : "Significant Drift"}
                    </div>
                  </div>
                  {pos.thesis && (
                    <div className="rounded-md border border-border/60 bg-muted/30 p-3 mb-2">
                      <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Original Thesis</p>
                      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">{pos.thesis}</p>
                    </div>
                  )}
                  {pos.decisionHistory.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Decision Trail ({pos.decisionHistory.length})</p>
                      {pos.decisionHistory.slice(0, 3).map((d, i) => (
                        <p key={i} className="text-[11px] text-muted-foreground">
                          <span className="font-mono text-[10px] text-muted-foreground/50">{new Date(d.date).toLocaleDateString()}</span>
                          {" — "}{d.type}{d.toState ? ` → ${d.toState}` : ""}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
