import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ValuationRange {
  method: string;
  low: number;
  mid: number;
  high: number;
  color: string;
}

const defaultRanges: ValuationRange[] = [
  { method: "DCF Analysis", low: 280, mid: 420, high: 560, color: "hsl(var(--primary))" },
  { method: "Comp Companies", low: 320, mid: 450, high: 580, color: "hsl(var(--chart-1))" },
  { method: "Precedent Txns", low: 350, mid: 480, high: 620, color: "hsl(var(--chart-2))" },
  { method: "LBO Analysis", low: 260, mid: 380, high: 500, color: "hsl(var(--chart-4))" },
];

const formatVal = (v: number) => `$${v}M`;

const ValuationFootballField = ({ ranges = defaultRanges }: { ranges?: ValuationRange[] }) => {
  const allVals = ranges.flatMap((r) => [r.low, r.high]);
  const globalMin = Math.min(...allVals) * 0.85;
  const globalMax = Math.max(...allVals) * 1.1;
  const span = globalMax - globalMin;

  const toPercent = (v: number) => ((v - globalMin) / span) * 100;

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Valuation Football Field</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ranges.map((r) => (
          <div key={r.method} className="flex items-center gap-3">
            <div className="w-32 shrink-0 text-xs text-muted-foreground font-medium text-right">{r.method}</div>
            <div className="flex-1 relative h-7 rounded bg-muted/30">
              {/* Bar */}
              <div
                className="absolute top-1 bottom-1 rounded-sm opacity-80"
                style={{
                  left: `${toPercent(r.low)}%`,
                  width: `${toPercent(r.high) - toPercent(r.low)}%`,
                  backgroundColor: r.color,
                }}
              />
              {/* Mid marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5"
                style={{ left: `${toPercent(r.mid)}%`, backgroundColor: r.color }}
              />
              {/* Labels */}
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
