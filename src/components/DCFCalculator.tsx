import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formatVal = (v: number) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
};

const DCFCalculator = () => {
  const [inputs, setInputs] = useState({
    revenue: 100,
    revenueGrowth: 15,
    ebitdaMargin: 25,
    taxRate: 25,
    capexPct: 5,
    nwcPct: 2,
    wacc: 10,
    terminalGrowth: 3,
    projectionYears: 5,
  });

  const update = (key: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) setInputs((p) => ({ ...p, [key]: num }));
  };

  const dcf = useMemo(() => {
    const { revenue, revenueGrowth, ebitdaMargin, taxRate, capexPct, nwcPct, wacc, terminalGrowth, projectionYears } = inputs;
    const years: { year: number; rev: number; ebitda: number; fcf: number; pvFcf: number }[] = [];
    let totalPV = 0;
    let lastFcf = 0;

    for (let i = 1; i <= projectionYears; i++) {
      const rev = revenue * Math.pow(1 + revenueGrowth / 100, i);
      const ebitda = rev * (ebitdaMargin / 100);
      const nopat = ebitda * (1 - taxRate / 100);
      const fcf = nopat - rev * (capexPct / 100) - rev * (nwcPct / 100);
      const pv = fcf / Math.pow(1 + wacc / 100, i);
      totalPV += pv;
      lastFcf = fcf;
      years.push({ year: i, rev, ebitda, fcf, pvFcf: pv });
    }

    const terminalValue = (lastFcf * (1 + terminalGrowth / 100)) / (wacc / 100 - terminalGrowth / 100);
    const pvTerminal = terminalValue / Math.pow(1 + wacc / 100, projectionYears);
    const enterpriseValue = totalPV + pvTerminal;

    return { years, terminalValue, pvTerminal, totalPV, enterpriseValue };
  }, [inputs]);

  // Sensitivity matrix: WACC vs Terminal Growth
  const waccRange = [8, 9, 10, 11, 12];
  const tgrRange = [1.5, 2.0, 2.5, 3.0, 3.5];

  const sensitivityMatrix = useMemo(() => {
    return waccRange.map((w) =>
      tgrRange.map((tg) => {
        const { revenue, revenueGrowth, ebitdaMargin, taxRate, capexPct, nwcPct, projectionYears } = inputs;
        let totalPV = 0;
        let lastFcf = 0;
        for (let i = 1; i <= projectionYears; i++) {
          const rev = revenue * Math.pow(1 + revenueGrowth / 100, i);
          const ebitda = rev * (ebitdaMargin / 100);
          const nopat = ebitda * (1 - taxRate / 100);
          const fcf = nopat - rev * (capexPct / 100) - rev * (nwcPct / 100);
          totalPV += fcf / Math.pow(1 + w / 100, i);
          lastFcf = fcf;
        }
        const tv = (lastFcf * (1 + tg / 100)) / (w / 100 - tg / 100);
        const pvTv = tv / Math.pow(1 + w / 100, projectionYears);
        return totalPV + pvTv;
      })
    );
  }, [inputs]);

  const fields = [
    { key: "revenue", label: "Base Revenue ($M)", step: 10 },
    { key: "revenueGrowth", label: "Revenue Growth (%)", step: 1 },
    { key: "ebitdaMargin", label: "EBITDA Margin (%)", step: 1 },
    { key: "taxRate", label: "Tax Rate (%)", step: 1 },
    { key: "capexPct", label: "CapEx (% of Rev)", step: 0.5 },
    { key: "nwcPct", label: "NWC Change (% of Rev)", step: 0.5 },
    { key: "wacc", label: "WACC (%)", step: 0.5 },
    { key: "terminalGrowth", label: "Terminal Growth (%)", step: 0.25 },
  ];

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">DCF Assumptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input
                  type="number"
                  step={f.step}
                  value={inputs[f.key as keyof typeof inputs]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="h-8 font-mono text-sm bg-background"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Enterprise Value</p>
            <p className="text-2xl font-bold font-mono text-primary">{formatVal(dcf.enterpriseValue * 1e6)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">PV of Cash Flows</p>
            <p className="text-lg font-semibold font-mono">{formatVal(dcf.totalPV * 1e6)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">PV of Terminal Value</p>
            <p className="text-lg font-semibold font-mono">{formatVal(dcf.pvTerminal * 1e6)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {((dcf.pvTerminal / dcf.enterpriseValue) * 100).toFixed(0)}% of EV
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Projections Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Projected Cash Flows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Year</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">EBITDA</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">FCF</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">PV of FCF</th>
                </tr>
              </thead>
              <tbody>
                {dcf.years.map((y) => (
                  <tr key={y.year} className="border-b border-border/50">
                    <td className="py-1.5 px-2 font-mono text-xs">Year {y.year}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(y.rev * 1e6)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(y.ebitda * 1e6)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(y.fcf * 1e6)}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(y.pvFcf * 1e6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sensitivity Table */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Sensitivity Analysis — WACC vs Terminal Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-left">WACC \ TGR</th>
                  {tgrRange.map((tg) => (
                    <th key={tg} className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">
                      {tg.toFixed(1)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waccRange.map((w, wi) => (
                  <tr key={w} className="border-b border-border/50">
                    <td className="py-1.5 px-2 font-mono text-xs font-medium">{w}%</td>
                    {sensitivityMatrix[wi].map((ev, gi) => {
                      const isBase = w === inputs.wacc && tgrRange[gi] === inputs.terminalGrowth;
                      return (
                        <td
                          key={gi}
                          className={`py-1.5 px-2 text-right font-mono text-xs ${
                            isBase ? "bg-primary/10 text-primary font-bold" : ""
                          }`}
                        >
                          {formatVal(ev * 1e6)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Highlighted cell reflects current assumptions.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DCFCalculator;
