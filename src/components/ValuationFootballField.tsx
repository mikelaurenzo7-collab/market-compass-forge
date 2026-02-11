import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

  if (rev <= 0 || !sm) return defaultRanges;

  const revM = rev / 1e6; // convert to $M

  // DCF: estimate range from 4-12x revenue with growth adjustments
  const dcfLow = revM * 3.5;
  const dcfMid = revM * 6;
  const dcfHigh = revM * 10;

  // Comp Companies: use sector EV/Revenue multiples applied to revenue
  const compLow = revM * (sm.evRevenue.p25 || 3);
  const compMid = revM * (sm.evRevenue.median || 5);
  const compHigh = revM * (sm.evRevenue.p75 || 8);

  // Precedent Txns: use precedent multiples
  const ptLow = revM * ((sm.evRevenue.p25 || 3) * 0.9);
  const ptMid = revM * ((sm.evRevenue.median || 5) * 1.05);
  const ptHigh = revM * ((sm.evRevenue.p75 || 8) * 1.15);

  // LBO: back into EV from target 15-25% IRR (simplified)
  const ebitdaM = ebitda > 0 ? ebitda / 1e6 : revM * 0.2;
  const lboLow = ebitdaM * 5; // ~25% IRR target
  const lboMid = ebitdaM * 7; // ~20% IRR target
  const lboHigh = ebitdaM * 9; // ~15% IRR target

  return [
    { method: "DCF Analysis", low: Math.round(dcfLow), mid: Math.round(dcfMid), high: Math.round(dcfHigh), color: "hsl(var(--primary))" },
    { method: "Comp Companies", low: Math.round(compLow), mid: Math.round(compMid), high: Math.round(compHigh), color: "hsl(var(--chart-1))" },
    { method: "Precedent Txns", low: Math.round(ptLow), mid: Math.round(ptMid), high: Math.round(ptHigh), color: "hsl(var(--chart-2))" },
    { method: "LBO Analysis", low: Math.round(lboLow), mid: Math.round(lboMid), high: Math.round(lboHigh), color: "hsl(var(--chart-4))" },
  ];
};

const formatVal = (v: number) => `$${v}M`;

const ValuationFootballField = ({ ranges: propRanges, companyData }: { ranges?: ValuationRange[]; companyData?: FootballFieldCompanyData }) => {
  const computedRanges = useMemo(() => {
    if (propRanges) return propRanges;
    if (companyData) return computeCompanyRanges(companyData);
    return defaultRanges;
  }, [propRanges, companyData]);

  const [ranges, setRanges] = useState<ValuationRange[]>(computedRanges);
  const [editing, setEditing] = useState(false);

  // Update when computed ranges change
  useMemo(() => {
    if (!editing) setRanges(computedRanges);
  }, [computedRanges, editing]);

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
          {isCompanyDriven && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Computed from company financials & sector multiples</p>
          )}
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {ranges.map((r, idx) => (
          <div key={r.method} className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-xs text-muted-foreground font-medium text-right">{r.method}</div>
              <div className="flex-1 relative h-7 rounded bg-muted/30">
                <div
                  className="absolute top-1 bottom-1 rounded-sm opacity-80"
                  style={{
                    left: `${toPercent(r.low)}%`,
                    width: `${toPercent(r.high) - toPercent(r.low)}%`,
                    backgroundColor: r.color,
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
            {editing && (
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
        ))}
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
