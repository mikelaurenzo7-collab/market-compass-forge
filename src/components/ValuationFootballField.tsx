import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAlphaSignals } from "@/hooks/useAlphaSignals";
import ConfidenceBadge from "@/components/ConfidenceBadge";

interface ValuationRange {
  method: string;
  low: number;
  mid: number;
  high: number;
  color: string;
}

export interface FootballFieldCompanyData {
  revenue?: number | null;
  ebitda?: number | null;
  growthRate?: number | null;
  grossMargin?: number | null;
  stage?: string | null;
  sector?: string | null;
  sectorMultiples?: {
    evRevenue: { p25: number; median: number; p75: number };
    evEbitda: { p25: number; median: number; p75: number };
  };
}

const defaultRanges: ValuationRange[] = [
  { method: "DCF Analysis", low: 280, mid: 420, high: 560, color: "hsl(var(--primary))" },
  { method: "Comp Companies", low: 320, mid: 450, high: 580, color: "hsl(var(--chart-1))" },
  { method: "Precedent Txns", low: 350, mid: 480, high: 620, color: "hsl(var(--chart-2))" },
  { method: "LBO Analysis", low: 260, mid: 380, high: 500, color: "hsl(var(--chart-4))" },
];

const computeCompanyRanges = (data: FootballFieldCompanyData): ValuationRange[] => {
  const rev = data.revenue ?? 0;
  const ebitda = data.ebitda ?? 0;
  const sm = data.sectorMultiples;
  const growth = data.growthRate ?? 0.15; // default 15% if unknown
  const margin = data.grossMargin ?? 0.5;

  if (rev <= 0 || !sm) return defaultRanges;

  const revM = rev / 1e6;
  const ebitdaM = ebitda > 0 ? ebitda / 1e6 : revM * Math.max(0.05, margin - 0.35);

  // ── DCF: 5-year projection with WACC-derived discount ──
  // WACC estimate: risk-free (4.5%) + equity risk premium adjusted by stage
  const stageRiskPremium = data.stage?.toLowerCase().includes("series a") ? 0.12
    : data.stage?.toLowerCase().includes("series b") ? 0.09
    : data.stage?.toLowerCase().includes("growth") ? 0.06
    : data.stage?.toLowerCase().includes("public") ? 0.03 : 0.07;
  const wacc = 0.045 + stageRiskPremium; // 7.5% - 16.5%
  const terminalMultiple = Math.max(4, Math.min(15, 8 + growth * 10)); // 4-15x based on growth

  // Project 5 years of FCF from EBITDA proxy
  const projectedFCFs = Array.from({ length: 5 }, (_, yr) => {
    const projectedEbitda = ebitdaM * Math.pow(1 + growth, yr + 1);
    const fcf = projectedEbitda * 0.75; // ~25% reinvestment/capex/tax
    return fcf / Math.pow(1 + wacc, yr + 1);
  });
  const pvFCF = projectedFCFs.reduce((s, v) => s + v, 0);
  const terminalYear5Ebitda = ebitdaM * Math.pow(1 + growth, 5);
  const terminalValue = (terminalYear5Ebitda * terminalMultiple) / Math.pow(1 + wacc, 5);
  const dcfMid = Math.round(pvFCF + terminalValue);
  const dcfLow = Math.round(dcfMid * 0.7);
  const dcfHigh = Math.round(dcfMid * 1.35);

  // ── Comp Companies: sector P25/Median/P75 EV/Revenue applied directly ──
  const compLow = Math.round(revM * (sm.evRevenue.p25 || 3));
  const compMid = Math.round(revM * (sm.evRevenue.median || 5));
  const compHigh = Math.round(revM * (sm.evRevenue.p75 || 8));

  // ── Precedent Transactions: typically trade at a premium to public comps ──
  const controlPremium = 1.15; // ~15% control premium for M&A
  const ptLow = Math.round(revM * (sm.evRevenue.p25 || 3) * controlPremium * 0.9);
  const ptMid = Math.round(revM * (sm.evRevenue.median || 5) * controlPremium);
  const ptHigh = Math.round(revM * (sm.evRevenue.p75 || 8) * controlPremium * 1.05);

  // ── LBO: back into EV from target 20-25% IRR with realistic leverage ──
  // Assume 4-6x leverage on EBITDA, 5-year hold, ~3x equity return target
  const leverageLow = 4.0;
  const leverageMid = 5.0;
  const leverageHigh = 6.0;
  const debtLow = ebitdaM * leverageLow;
  const debtMid = ebitdaM * leverageMid;
  const debtHigh = ebitdaM * leverageHigh;
  // Exit at sector median multiple, equity = EV - debt
  const exitEbitda = ebitdaM * Math.pow(1 + Math.min(growth, 0.15), 5);
  const exitMultiple = sm.evEbitda.median > 0 ? sm.evEbitda.median : 8;
  const exitEV = exitEbitda * exitMultiple;
  // Target 3x equity return → entry equity = exit equity / 3
  const lboEquityLow = Math.max(10, (exitEV - debtHigh) / 3.5);
  const lboEquityMid = Math.max(10, (exitEV - debtMid) / 3.0);
  const lboEquityHigh = Math.max(10, (exitEV - debtLow) / 2.5);
  const lboLow = Math.round(lboEquityLow + debtLow);
  const lboMid = Math.round(lboEquityMid + debtMid);
  const lboHigh = Math.round(lboEquityHigh + debtHigh);

  return [
    { method: "DCF Analysis", low: dcfLow, mid: dcfMid, high: dcfHigh, color: "hsl(var(--primary))" },
    { method: "Comp Companies", low: compLow, mid: compMid, high: compHigh, color: "hsl(var(--chart-1))" },
    { method: "Precedent Txns", low: ptLow, mid: ptMid, high: ptHigh, color: "hsl(var(--chart-2))" },
    { method: "LBO Analysis", low: lboLow, mid: lboMid, high: lboHigh, color: "hsl(var(--chart-4))" },
  ];
};

const formatVal = (v: number) => `$${v}M`;

const ValuationFootballField = ({ ranges: propRanges, companyData }: { ranges?: ValuationRange[]; companyData?: FootballFieldCompanyData }) => {
  const { data: alphaSignals } = useAlphaSignals();

  const computedRanges = useMemo(() => {
    if (propRanges) return propRanges;
    if (companyData) return computeCompanyRanges(companyData);
    return defaultRanges;
  }, [propRanges, companyData]);

  // Compute AI-Adjusted bar from alpha signals
  const aiAdjustedRange = useMemo(() => {
    if (!alphaSignals?.length || !companyData?.sector) return null;
    const sectorSignal = alphaSignals.find(s =>
      companyData.sector?.toLowerCase().includes(s.sector.toLowerCase()) ||
      s.sector.toLowerCase().includes(companyData.sector?.toLowerCase() ?? "")
    );
    if (!sectorSignal || !sectorSignal.magnitude_pct) return null;

    // Apply magnitude shift to the Comp Companies range
    const compRange = computedRanges.find(r => r.method === "Comp Companies");
    if (!compRange) return null;

    const shift = 1 + (sectorSignal.magnitude_pct / 100);
    return {
      range: {
        method: "AI Adjusted",
        low: Math.round(compRange.low * shift),
        mid: Math.round(compRange.mid * shift),
        high: Math.round(compRange.high * shift),
        color: "hsl(var(--chart-3))",
      } as ValuationRange,
      signal: sectorSignal,
    };
  }, [alphaSignals, companyData?.sector, computedRanges]);

  const allRanges = useMemo(() => {
    const base = [...computedRanges];
    if (aiAdjustedRange) base.push(aiAdjustedRange.range);
    return base;
  }, [computedRanges, aiAdjustedRange]);

  const [ranges, setRanges] = useState<ValuationRange[]>(allRanges);
  const [editing, setEditing] = useState(false);

  // Update when computed ranges change
  useMemo(() => {
    if (!editing) setRanges(allRanges);
  }, [allRanges, editing]);

  const allVals = ranges.flatMap((r) => [r.low, r.high]);
  const globalMin = Math.min(...allVals) * 0.85;
  const globalMax = Math.max(...allVals) * 1.1;
  const span = globalMax - globalMin;

  const toPercent = (v: number) => ((v - globalMin) / span) * 100;

  const updateRange = (idx: number, field: "low" | "mid" | "high", value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setRanges((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: num } : r));
  };

  const isCompanyDriven = !!companyData && !propRanges;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">Valuation Football Field</CardTitle>
          <div className="flex items-center gap-2 mt-0.5">
            {isCompanyDriven && (
              <p className="text-[10px] text-muted-foreground">Computed from company financials & sector multiples</p>
            )}
            {aiAdjustedRange && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-chart-3/10 text-chart-3 border border-chart-3/20">
                AI {aiAdjustedRange.signal.direction === "bullish" ? "↑" : aiAdjustedRange.signal.direction === "bearish" ? "↓" : "→"}
                {Math.abs(aiAdjustedRange.signal.magnitude_pct).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {ranges.map((r, idx) => {
          const isAI = r.method === "AI Adjusted";
          return (
          <div key={r.method} className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-xs text-muted-foreground font-medium text-right flex items-center justify-end gap-1">
                {isAI && <span className="text-[8px] px-1 py-0.5 rounded bg-chart-3/10 text-chart-3">AI</span>}
                {r.method}
              </div>
              <div className="flex-1 relative h-7 rounded bg-muted/30">
                <div
                  className={`absolute top-1 bottom-1 rounded-sm ${isAI ? "opacity-40 border-2 border-dashed" : "opacity-80"}`}
                  style={{
                    left: `${toPercent(r.low)}%`,
                    width: `${toPercent(r.high) - toPercent(r.low)}%`,
                    backgroundColor: isAI ? "transparent" : r.color,
                    borderColor: isAI ? r.color : undefined,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: `${toPercent(r.mid)}%`, backgroundColor: r.color }}
                />
                <span
                  className="absolute -top-4 text-[9px] font-mono text-muted-foreground"
                  style={{ left: `${toPercent(r.low)}%`, transform: "translateX(-50%)" }}
                >
                  {formatVal(r.low)}
                </span>
                <span
                  className="absolute -top-4 text-[9px] font-mono font-bold"
                  style={{ left: `${toPercent(r.mid)}%`, transform: "translateX(-50%)", color: r.color }}
                >
                  {formatVal(r.mid)}
                </span>
                <span
                  className="absolute -top-4 text-[9px] font-mono text-muted-foreground"
                  style={{ left: `${toPercent(r.high)}%`, transform: "translateX(-50%)" }}
                >
                  {formatVal(r.high)}
                </span>
              </div>
            </div>
            {editing && !isAI && (
              <div className="flex items-center gap-2 ml-[calc(8rem+0.75rem)]">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  Low:
                  <Input type="number" value={r.low} onChange={(e) => updateRange(idx, "low", e.target.value)} className="h-6 w-16 text-xs font-mono px-1.5 bg-background" />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  Mid:
                  <Input type="number" value={r.mid} onChange={(e) => updateRange(idx, "mid", e.target.value)} className="h-6 w-16 text-xs font-mono px-1.5 bg-background" />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  High:
                  <Input type="number" value={r.high} onChange={(e) => updateRange(idx, "high", e.target.value)} className="h-6 w-16 text-xs font-mono px-1.5 bg-background" />
                </div>
              </div>
            )}
          </div>
          );
        })}
        <div className="flex items-center gap-3 mt-4">
          <div className="w-32" />
          <div className="flex-1 flex justify-between text-[9px] text-muted-foreground font-mono">
            <span>{formatVal(Math.round(globalMin))}</span>
            <span>{formatVal(Math.round(globalMax))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ValuationFootballField;
