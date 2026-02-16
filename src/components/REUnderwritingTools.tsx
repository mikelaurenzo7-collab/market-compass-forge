import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  calcDSCR, calcDebtSizing, calcCapRateSensitivity,
  calcOccupancyStress, calcHoldScenarios,
  type UnderwritingInputs,
} from "@/lib/underwriting";

interface REUnderwritingToolsProps {
  askingPrice: number;
  noi: number;
  capRate: number;
  benchmarkCapRate?: number;
  // Default assumptions (from listing or user input)
  loanAmount?: number;
  interestRate?: number;
  loanTermYears?: number;
  amortizationYears?: number;
  occupancyPct?: number;
  opexRatio?: number;
  rentGrowthPct?: number;
  exitCapRate?: number;
  holdYears?: number;
  onInputsChange?: (inputs: UnderwritingInputs) => void;
}

const fmtCurrency = (v: number) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
};

const InputRow = ({ label, value, onChange, suffix = "", step = "1", min = "0" }: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: string; min?: string;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        min={min}
        className="w-20 h-7 px-2 rounded bg-secondary border border-border text-xs font-mono text-foreground text-right focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {suffix && <span className="text-[10px] text-muted-foreground w-4">{suffix}</span>}
    </div>
  </div>
);

const REUnderwritingTools = (props: REUnderwritingToolsProps) => {
  const [loan, setLoan] = useState(props.loanAmount ?? Math.round(props.askingPrice * 0.65));
  const [rate, setRate] = useState(props.interestRate ?? 6.5);
  const [term, setTerm] = useState(props.loanTermYears ?? 10);
  const [amort, setAmort] = useState(props.amortizationYears ?? 30);
  const [occ, setOcc] = useState(props.occupancyPct ?? 95);
  const [opex, setOpex] = useState((props.opexRatio ?? 0.4) * 100);
  const [growth, setGrowth] = useState(props.rentGrowthPct ?? 2.0);
  const [exitCap, setExitCap] = useState(props.exitCapRate ?? props.capRate + 0.5);
  const [hold, setHold] = useState(props.holdYears ?? 5);

  const inputs: UnderwritingInputs = useMemo(() => ({
    askingPrice: props.askingPrice,
    noi: props.noi,
    occupancyPct: occ,
    loanAmount: loan,
    interestRate: rate,
    loanTermYears: term,
    amortizationYears: amort,
    opexRatio: opex / 100,
    rentGrowthPct: growth,
    exitCapRate: exitCap,
    holdYears: hold,
  }), [props.askingPrice, props.noi, loan, rate, term, amort, occ, opex, growth, exitCap, hold]);

  const dscr = useMemo(() => calcDSCR(inputs), [inputs]);
  const debt = useMemo(() => calcDebtSizing(inputs), [inputs]);
  const capSens = useMemo(() => calcCapRateSensitivity(props.noi, props.capRate, props.benchmarkCapRate ?? props.capRate), [props.noi, props.capRate, props.benchmarkCapRate]);
  const occStress = useMemo(() => calcOccupancyStress(props.noi, occ, loan, rate, amort), [props.noi, occ, loan, rate, amort]);
  const holdScenarios = useMemo(() => calcHoldScenarios(inputs), [inputs]);

  const dscrColor = dscr.rating === "strong" ? "text-success" : dscr.rating === "adequate" ? "text-warning" : "text-destructive";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Underwriting Tools</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dscr" className="space-y-3">
          <TabsList className="bg-muted/30 border border-border h-8">
            <TabsTrigger value="dscr" className="text-[10px] h-6">DSCR</TabsTrigger>
            <TabsTrigger value="debt" className="text-[10px] h-6">Debt</TabsTrigger>
            <TabsTrigger value="caprate" className="text-[10px] h-6">Cap Rate</TabsTrigger>
            <TabsTrigger value="occupancy" className="text-[10px] h-6">Occupancy</TabsTrigger>
            <TabsTrigger value="hold" className="text-[10px] h-6">Hold</TabsTrigger>
          </TabsList>

          {/* Assumptions sidebar */}
          <div className="p-3 bg-secondary/50 rounded-lg space-y-2 mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Assumptions</p>
            <InputRow label="Loan Amount" value={loan} onChange={setLoan} step="100000" />
            <InputRow label="Interest Rate" value={rate} onChange={setRate} suffix="%" step="0.25" />
            <InputRow label="Amortization" value={amort} onChange={setAmort} suffix="yr" />
            <InputRow label="Occupancy" value={occ} onChange={setOcc} suffix="%" />
            <InputRow label="Rent Growth" value={growth} onChange={setGrowth} suffix="%" step="0.5" />
            <InputRow label="Exit Cap Rate" value={exitCap} onChange={setExitCap} suffix="%" step="0.25" />
            <InputRow label="Hold Period" value={hold} onChange={setHold} suffix="yr" />
          </div>

          <TabsContent value="dscr" className="space-y-3 mt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">DSCR</p>
                <p className={`text-xl font-bold font-mono ${dscrColor}`}>{dscr.dscr}x</p>
                <Badge variant="outline" className="text-[9px] mt-1 capitalize">{dscr.rating}</Badge>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-[10px] text-muted-foreground uppercase">Annual Debt Service</p>
                <p className="text-lg font-bold font-mono text-foreground">{fmtCurrency(dscr.annualDebtService)}</p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase">Max Loan @ 1.25x DSCR</p>
                <p className="text-lg font-bold font-mono text-primary">{fmtCurrency(dscr.maxLoanAtTarget)}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="debt" className="space-y-3 mt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Loan (75% LTV)</span>
                <span className="font-mono text-foreground">{fmtCurrency(debt.maxLoanLTV)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Max Loan (1.25x DSCR)</span>
                <span className="font-mono text-foreground">{fmtCurrency(debt.maxLoanDSCR)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-border pt-2">
                <span className="text-foreground">Constrained By</span>
                <Badge variant="outline" className="text-[10px] uppercase">{debt.constrainingFactor}</Badge>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-foreground">Max Proceeds</span>
                <span className="font-mono text-primary">{fmtCurrency(debt.maxLoan)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current LTV</span>
                <span className="font-mono text-foreground">{debt.ltv}%</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="caprate" className="space-y-2 mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Cap Rate</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">Implied Value</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">Δ Value</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">Spread</th>
                  </tr>
                </thead>
                <tbody>
                  {capSens.map((r) => (
                    <tr key={r.capRate} className={`border-b border-border/30 ${r.capRate === props.capRate ? "bg-primary/5" : ""}`}>
                      <td className="py-1.5 px-2 font-mono">{r.capRate}%</td>
                      <td className="py-1.5 px-2 font-mono text-right">{fmtCurrency(r.impliedValue)}</td>
                      <td className={`py-1.5 px-2 font-mono text-right ${r.valueChange > 0 ? "text-success" : r.valueChange < 0 ? "text-destructive" : ""}`}>
                        {r.valueChange > 0 ? "+" : ""}{fmtCurrency(Math.abs(r.valueChange))}
                      </td>
                      <td className="py-1.5 px-2 font-mono text-right text-muted-foreground">{r.spreadToBenchmark > 0 ? "+" : ""}{r.spreadToBenchmark}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="occupancy" className="space-y-2 mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Occupancy</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">Eff. NOI</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">DSCR</th>
                    <th className="text-center py-1 px-2 text-muted-foreground font-medium">Covenant</th>
                  </tr>
                </thead>
                <tbody>
                  {occStress.map((r) => (
                    <tr key={r.occupancy} className={`border-b border-border/30 ${r.occupancy === occ ? "bg-primary/5" : ""}`}>
                      <td className="py-1.5 px-2 font-mono">{r.occupancy}%</td>
                      <td className="py-1.5 px-2 font-mono text-right">{fmtCurrency(r.effectiveNOI)}</td>
                      <td className={`py-1.5 px-2 font-mono text-right ${r.breachesCovenants ? "text-destructive" : "text-success"}`}>{r.dscr}x</td>
                      <td className="py-1.5 px-2 text-center">
                        {r.breachesCovenants
                          ? <span className="text-[9px] text-destructive font-medium">BREACH</span>
                          : <span className="text-[9px] text-success font-medium">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="hold" className="space-y-2 mt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1 px-2 text-muted-foreground font-medium">Year</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">NOI</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">Exit Value</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">EM</th>
                    <th className="text-right py-1 px-2 text-muted-foreground font-medium">IRR</th>
                  </tr>
                </thead>
                <tbody>
                  {holdScenarios.filter(s => s.year <= Math.max(hold, 10)).map((r) => (
                    <tr key={r.year} className={`border-b border-border/30 ${r.year === hold ? "bg-primary/5" : ""}`}>
                      <td className="py-1.5 px-2 font-mono">{r.year}</td>
                      <td className="py-1.5 px-2 font-mono text-right">{fmtCurrency(r.noi)}</td>
                      <td className="py-1.5 px-2 font-mono text-right">{fmtCurrency(r.exitValue)}</td>
                      <td className="py-1.5 px-2 font-mono text-right">{r.equityMultiple}x</td>
                      <td className={`py-1.5 px-2 font-mono text-right ${r.irr > 15 ? "text-success" : r.irr > 8 ? "text-warning" : "text-destructive"}`}>{r.irr}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default REUnderwritingTools;
