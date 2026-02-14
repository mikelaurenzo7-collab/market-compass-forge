import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAlphaSignals } from "@/hooks/useAlphaSignals";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import { motion } from "framer-motion";
import { BarChart3, Crosshair } from "lucide-react";

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
  const growth = data.growthRate ?? 0.15;
  const margin = data.grossMargin ?? 0.5;

  if (rev <= 0 || !sm) return defaultRanges;

  const revM = rev / 1e6;
  const ebitdaM = ebitda > 0 ? ebitda / 1e6 : revM * Math.max(0.05, margin - 0.35);

  const stageRiskPremium = data.stage?.toLowerCase().includes("series a") ? 0.12
    : data.stage?.toLowerCase().includes("series b") ? 0.09
    : data.stage?.toLowerCase().includes("growth") ? 0.06
    : data.stage?.toLowerCase().includes("public") ? 0.03 : 0.07;
  const wacc = 0.045 + stageRiskPremium;
  const terminalMultiple = Math.max(4, Math.min(15, 8 + growth * 10));

  const projectedFCFs = Array.from({ length: 5 }, (_, yr) => {
    const projectedEbitda = ebitdaM * Math.pow(1 + growth, yr + 1);
    const fcf = projectedEbitda * 0.75;
    return fcf / Math.pow(1 + wacc, yr + 1);
  });
  const pvFCF = projectedFCFs.reduce((s, v) => s + v, 0);
  const terminalYear5Ebitda = ebitdaM * Math.pow(1 + growth, 5);
  const terminalValue = (terminalYear5Ebitda * terminalMultiple) / Math.pow(1 + wacc, 5);
  const dcfMid = Math.round(pvFCF + terminalValue);
  const dcfLow = Math.round(dcfMid * 0.7);
  const dcfHigh = Math.round(dcfMid * 1.35);

  const compLow = Math.round(revM * (sm.evRevenue.p25 || 3));
  const compMid = Math.round(revM * (sm.evRevenue.median || 5));
  const compHigh = Math.round(revM * (sm.evRevenue.p75 || 8));

  const controlPremium = 1.15;
  const ptLow = Math.round(revM * (sm.evRevenue.p25 || 3) * controlPremium * 0.9);
  const ptMid = Math.round(revM * (sm.evRevenue.median || 5) * controlPremium);
  const ptHigh = Math.round(revM * (sm.evRevenue.p75 || 8) * controlPremium * 1.05);

  const leverageLow = 4.0;
  const leverageMid = 5.0;
  const leverageHigh = 6.0;
  const debtLow = ebitdaM * leverageLow;
  const debtMid = ebitdaM * leverageMid;
  const debtHigh = ebitdaM * leverageHigh;
  const exitEbitda = ebitdaM * Math.pow(1 + Math.min(growth, 0.15), 5);
  const exitMultiple = sm.evEbitda.median > 0 ? sm.evEbitda.median : 8;
  const exitEV = exitEbitda * exitMultiple;
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

const AnimatedBar = ({ range, index, globalMin, span, isAI }: { range: ValuationRange; index: number; globalMin: number; span: number; isAI: boolean }) => {
  const toPercent = (v: number) => ((v - globalMin) / span) * 100;
  const leftPct = toPercent(range.low);
  const widthPct = toPercent(range.high) - leftPct;
  const midPct = toPercent(range.mid);

  return (
    <div className="relative h-9 rounded-md bg-muted/20 overflow-hidden group">
      {/* Gradient background bar */}
      <motion.div
        className={`absolute top-1.5 bottom-1.5 rounded-sm ${isAI ? "border-2 border-dashed" : ""}`}
        style={{
          borderColor: isAI ? range.color : undefined,
          background: isAI ? "transparent" : `linear-gradient(90deg, ${range.color}33 0%, ${range.color}88 50%, ${range.color}33 100%)`,
        }}
        initial={{ left: `${leftPct}%`, width: 0, opacity: 0 }}
        animate={{ width: `${widthPct}%`, opacity: 1 }}
        transition={{ duration: 0.8, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Mid marker with glow */}
      <motion.div
        className="absolute top-0 bottom-0 w-0.5"
        style={{ backgroundColor: range.color, boxShadow: `0 0 8px ${range.color}60` }}
        initial={{ left: `${midPct}%`, scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: index * 0.12 + 0.4 }}
      />
      {/* Value labels */}
      <motion.span
        className="absolute -top-4 text-[9px] font-mono text-muted-foreground"
        style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.12 + 0.3 }}
      >
        {formatVal(range.low)}
      </motion.span>
      <motion.span
        className="absolute -top-4 text-[9px] font-mono font-bold"
        style={{ left: `${midPct}%`, transform: "translateX(-50%)", color: range.color }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.12 + 0.5 }}
      >
        {formatVal(range.mid)}
      </motion.span>
      <motion.span
        className="absolute -top-4 text-[9px] font-mono text-muted-foreground"
        style={{ left: `${toPercent(range.high)}%`, transform: "translateX(-50%)" }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.12 + 0.3 }}
      >
        {formatVal(range.high)}
      </motion.span>
    </div>
  );
};

const ValuationFootballField = ({ ranges: propRanges, companyData }: { ranges?: ValuationRange[]; companyData?: FootballFieldCompanyData }) => {
  const { data: alphaSignals } = useAlphaSignals();

  const computedRanges = useMemo(() => {
    if (propRanges) return propRanges;
    if (companyData) return computeCompanyRanges(companyData);
    return defaultRanges;
  }, [propRanges, companyData]);

  const dataSource = companyData?.sectorMultiples ? "live" : "default";

  const aiAdjustedRange = useMemo(() => {
    if (!alphaSignals?.length || !companyData?.sector) return null;
    const sectorSignal = alphaSignals.find(s =>
      companyData.sector?.toLowerCase().includes(s.sector.toLowerCase()) ||
      s.sector.toLowerCase().includes(companyData.sector?.toLowerCase() ?? "")
    );
    if (!sectorSignal || !sectorSignal.magnitude_pct) return null;
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

  useMemo(() => {
    if (!editing) setRanges(allRanges);
  }, [allRanges, editing]);

  const allVals = ranges.flatMap((r) => [r.low, r.high]);
  const globalMin = Math.min(...allVals) * 0.85;
  const globalMax = Math.max(...allVals) * 1.1;
  const span = globalMax - globalMin;

  const updateRange = (idx: number, field: "low" | "mid" | "high", value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setRanges((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: num } : r));
  };

  // Consensus zone: overlap of all non-AI ranges
  const consensus = useMemo(() => {
    const nonAI = ranges.filter(r => r.method !== "AI Adjusted");
    if (nonAI.length < 2) return null;
    const overlapLow = Math.max(...nonAI.map(r => r.low));
    const overlapHigh = Math.min(...nonAI.map(r => r.high));
    if (overlapLow >= overlapHigh) return null;
    const midValues = nonAI.map(r => r.mid);
    const avgMid = Math.round(midValues.reduce((a, b) => a + b, 0) / midValues.length);
    return { low: overlapLow, high: overlapHigh, mid: avgMid };
  }, [ranges]);

  const isCompanyDriven = !!companyData && !propRanges;

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Valuation Football Field</CardTitle>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {isCompanyDriven && (
              <p className="text-[10px] text-muted-foreground">Computed from company financials & sector multiples</p>
            )}
            {dataSource === "live" && isCompanyDriven && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-success/10 text-success border border-success/20">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                Live Data
              </span>
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
          className="text-[10px] px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Consensus zone callout */}
        {consensus && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 p-2.5 rounded-md bg-primary/5 border border-primary/15"
          >
            <Crosshair className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-primary">Consensus Range</p>
              <p className="text-[10px] text-muted-foreground">
                All methodologies converge at <span className="font-mono font-medium text-foreground">{formatVal(consensus.low)} – {formatVal(consensus.high)}</span> · 
                Avg midpoint <span className="font-mono font-medium text-primary">{formatVal(consensus.mid)}</span>
              </p>
            </div>
          </motion.div>
        )}

        {ranges.map((r, idx) => {
          const isAI = r.method === "AI Adjusted";
          return (
            <div key={r.method} className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs text-muted-foreground font-medium text-right flex items-center justify-end gap-1.5">
                  {isAI && <span className="text-[8px] px-1 py-0.5 rounded bg-chart-3/10 text-chart-3">AI</span>}
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.method}
                </div>
                <div className="flex-1">
                  <AnimatedBar range={r} index={idx} globalMin={globalMin} span={span} isAI={isAI} />
                </div>
              </div>
              {editing && !isAI && (
                <div className="flex items-center gap-2 ml-[calc(8rem+0.75rem)]">
                  {(["low", "mid", "high"] as const).map(field => (
                    <div key={field} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      {field.charAt(0).toUpperCase() + field.slice(1)}:
                      <Input type="number" value={r[field]} onChange={(e) => updateRange(idx, field, e.target.value)} className="h-6 w-16 text-xs font-mono px-1.5 bg-background" />
                    </div>
                  ))}
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
