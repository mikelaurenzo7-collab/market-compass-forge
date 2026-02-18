import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMacroIndicators } from "@/hooks/useMacroIndicators";
import { useDCFAutoPopulate } from "@/hooks/useDCFAutoPopulate";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Zap, Database } from "lucide-react";
import { motion } from "framer-motion";

export interface DCFCompanyProps {
  initialRevenue?: number; // in $M
  initialGrowth?: number; // as percentage e.g. 25
  initialMargin?: number; // as percentage e.g. 30
  companyName?: string;
  companyId?: string;
}

const formatVal = (v: number) => {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
};

// ─── DCF TAB ────────────────────────────────────────────────────────────────

const DCFTab = ({ initialRevenue, initialGrowth, initialMargin, companyName, companyId }: DCFCompanyProps) => {
  const { data: macroIndicators } = useMacroIndicators();
  const treasuryYield = macroIndicators?.find(m => m.series_id === "DGS10");
  const riskFreeRate = treasuryYield?.value ?? 4.28;
  
  // Company search for auto-populate
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(companyId ?? null);
  const { data: searchResults } = useQuery({
    queryKey: ["dcf-company-search", searchTerm],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, sector, market_type").ilike("name", `%${searchTerm}%`).limit(6);
      return data ?? [];
    },
    enabled: searchTerm.length >= 2,
  });
  const { data: autoData } = useDCFAutoPopulate(selectedCompanyId);

  // Build WACC from macro data + company beta
  const companyBeta = autoData?.beta ?? 1.0;
  const equityRiskPremium = 5.5;
  const macroWacc = Math.round((riskFreeRate + companyBeta * equityRiskPremium) * 10) / 10;

  const [inputs, setInputs] = useState({
    revenue: initialRevenue ?? 100,
    revenueGrowth: initialGrowth ?? 15,
    ebitdaMargin: initialMargin ?? 25,
    taxRate: 25,
    capexPct: 5,
    nwcPct: 2,
    wacc: macroWacc,
    terminalGrowth: 3,
    projectionYears: 5,
  });

  // Auto-populate when company data loads
  useEffect(() => {
    if (autoData) {
      setInputs(prev => ({
        ...prev,
        ...(autoData.revenue !== null && { revenue: Math.round(autoData.revenue) }),
        ...(autoData.revenueGrowth !== null && { revenueGrowth: autoData.revenueGrowth }),
        ...(autoData.ebitdaMargin !== null && { ebitdaMargin: autoData.ebitdaMargin }),
        wacc: macroWacc,
      }));
    }
  }, [autoData, macroWacc]);

  // Update WACC when macro data loads
  useEffect(() => {
    if (treasuryYield) {
      setInputs(prev => ({ ...prev, wacc: macroWacc }));
    }
  }, [treasuryYield, macroWacc]);

  // Update when props change (e.g. navigating between companies)
  useEffect(() => {
    if (initialRevenue !== undefined || initialGrowth !== undefined || initialMargin !== undefined) {
      setInputs(prev => ({
        ...prev,
        ...(initialRevenue !== undefined && { revenue: initialRevenue }),
        ...(initialGrowth !== undefined && { revenueGrowth: initialGrowth }),
        ...(initialMargin !== undefined && { ebitdaMargin: initialMargin }),
      }));
    }
  }, [initialRevenue, initialGrowth, initialMargin]);

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
      {/* Company Search for Auto-Populate */}
      {!companyId && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Auto-Populate from Real Data</span>
              {autoData && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                  <Database className="h-3 w-3" />
                  Source: {autoData.source}
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search a company to auto-fill revenue, growth, margin, beta..."
                value={selectedCompanyId && autoData ? autoData.companyName : searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setSelectedCompanyId(null); }}
                className="w-full h-8 pl-9 pr-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground"
              />
              {searchResults && searchResults.length > 0 && !selectedCompanyId && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                  {searchResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCompanyId(c.id); setSearchTerm(c.name); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center justify-between"
                    >
                      <span className="text-foreground">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.sector} · {c.market_type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            DCF Assumptions
            {(companyName || autoData?.companyName) && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                Pre-populated from {companyName || autoData?.companyName} financials
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {treasuryYield && (
            <div className="mb-3 px-3 py-2 rounded-md bg-primary/5 border border-primary/10 flex items-center gap-2 flex-wrap">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] text-muted-foreground">
                Rf: <span className="font-mono font-medium text-foreground">{riskFreeRate.toFixed(2)}%</span> (10Y Treasury)
                {autoData?.beta && (
                  <> · β: <span className="font-mono font-medium text-foreground">{companyBeta.toFixed(2)}</span></>
                )}
                {" "}→ WACC: <span className="font-mono font-medium text-foreground">{macroWacc}%</span>
                <span className="text-muted-foreground/60 ml-1">(Rf + β×ERP)</span>
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input type="number" step={f.step} value={inputs[f.key as keyof typeof inputs]} onChange={(e) => update(f.key, e.target.value)} className="h-8 font-mono text-sm bg-background" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
            <p className="text-[10px] text-muted-foreground mt-0.5">{((dcf.pvTerminal / dcf.enterpriseValue) * 100).toFixed(0)}% of EV</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Projected Cash Flows</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Year", "Revenue", "EBITDA", "FCF", "PV of FCF"].map((h) => (
                    <th key={h} className={`py-2 px-2 text-xs text-muted-foreground font-medium ${h === "Year" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
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

      <Card className="border-border bg-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sensitivity Analysis — WACC vs Terminal Growth</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-left">WACC \ TGR</th>
                  {tgrRange.map((tg) => (
                    <th key={tg} className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">{tg.toFixed(1)}%</th>
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
                        <td key={gi} className={`py-1.5 px-2 text-right font-mono text-xs ${isBase ? "bg-primary/10 text-primary font-bold" : ""}`}>
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

// ─── LBO TAB ────────────────────────────────────────────────────────────────

const LBOTab = ({ initialRevenue, initialMargin, companyName }: DCFCompanyProps) => {
  const entryEbitdaDefault = initialRevenue && initialMargin ? Math.round(initialRevenue * (initialMargin / 100)) : 50;
  const purchasePriceDefault = initialRevenue ? Math.round(initialRevenue * 5) : 500;

  const [inputs, setInputs] = useState({
    purchasePrice: purchasePriceDefault, equityPct: 40, debtRate: 6, holdPeriod: 5,
    exitMultiple: 8, entryEbitda: entryEbitdaDefault, ebitdaGrowth: 5, debtPaydownPct: 15,
  });

  useEffect(() => {
    if (initialRevenue !== undefined || initialMargin !== undefined) {
      setInputs(prev => ({
        ...prev,
        ...(initialRevenue !== undefined && { purchasePrice: Math.round(initialRevenue * 5) }),
        ...(initialRevenue !== undefined && initialMargin !== undefined && { entryEbitda: Math.round(initialRevenue * (initialMargin / 100)) }),
      }));
    }
  }, [initialRevenue, initialMargin]);

  const update = (key: string, val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num)) setInputs((p) => ({ ...p, [key]: num }));
  };

  const lbo = useMemo(() => {
    const { purchasePrice, equityPct, debtRate, holdPeriod, exitMultiple, entryEbitda, ebitdaGrowth, debtPaydownPct } = inputs;
    const equityInvested = purchasePrice * (equityPct / 100);
    const initialDebt = purchasePrice - equityInvested;

    const years: { year: number; ebitda: number; debtBalance: number; interestExpense: number }[] = [];
    let debtBalance = initialDebt;

    for (let i = 1; i <= holdPeriod; i++) {
      const ebitda = entryEbitda * Math.pow(1 + ebitdaGrowth / 100, i);
      const interest = debtBalance * (debtRate / 100);
      const paydown = ebitda * (debtPaydownPct / 100);
      debtBalance = Math.max(0, debtBalance - paydown);
      years.push({ year: i, ebitda, debtBalance, interestExpense: interest });
    }

    const exitEbitda = entryEbitda * Math.pow(1 + ebitdaGrowth / 100, holdPeriod);
    const exitEV = exitEbitda * exitMultiple;
    const exitEquity = exitEV - debtBalance;
    const moic = exitEquity / equityInvested;

    let irr = 0.15;
    for (let iter = 0; iter < 100; iter++) {
      const npv = -equityInvested + exitEquity / Math.pow(1 + irr, holdPeriod);
      const dnpv = -holdPeriod * exitEquity / Math.pow(1 + irr, holdPeriod + 1);
      const newIrr = irr - npv / dnpv;
      if (Math.abs(newIrr - irr) < 0.0001) break;
      irr = newIrr;
    }

    return { equityInvested, initialDebt, exitEbitda, exitEV, exitEquity, moic, irr, years, debtBalance };
  }, [inputs]);

  const fields = [
    { key: "purchasePrice", label: "Purchase Price ($M)", step: 10 },
    { key: "equityPct", label: "Equity %", step: 5 },
    { key: "entryEbitda", label: "Entry EBITDA ($M)", step: 5 },
    { key: "ebitdaGrowth", label: "EBITDA Growth (%)", step: 1 },
    { key: "debtRate", label: "Debt Interest Rate (%)", step: 0.5 },
    { key: "debtPaydownPct", label: "Debt Paydown (% EBITDA)", step: 5 },
    { key: "holdPeriod", label: "Hold Period (Yrs)", step: 1 },
    { key: "exitMultiple", label: "Exit EV/EBITDA", step: 0.5 },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            LBO Assumptions
            {companyName && <span className="ml-2 text-xs font-normal text-muted-foreground">Pre-populated from {companyName} financials</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input type="number" step={f.step} value={inputs[f.key as keyof typeof inputs]} onChange={(e) => update(f.key, e.target.value)} className="h-8 font-mono text-sm bg-background" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">IRR</p>
            <p className="text-2xl font-bold font-mono text-primary">{(lbo.irr * 100).toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">MOIC</p>
            <p className="text-2xl font-bold font-mono text-primary">{lbo.moic.toFixed(2)}x</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Exit Equity</p>
            <p className="text-lg font-semibold font-mono">{formatVal(lbo.exitEquity * 1e6)}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Exit EV</p>
            <p className="text-lg font-semibold font-mono">{formatVal(lbo.exitEV * 1e6)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Sources & Uses</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-left">Item</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">Amount</th>
                  <th className="py-2 px-2 text-xs text-muted-foreground font-medium text-right">% of Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/50">
                  <td className="py-1.5 px-2 text-xs font-medium">Equity</td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(lbo.equityInvested * 1e6)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs">{inputs.equityPct}%</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-1.5 px-2 text-xs font-medium">Debt</td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(lbo.initialDebt * 1e6)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs">{(100 - inputs.equityPct)}%</td>
                </tr>
                <tr className="font-medium">
                  <td className="py-1.5 px-2 text-xs">Total</td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(inputs.purchasePrice * 1e6)}</td>
                  <td className="py-1.5 px-2 text-right font-mono text-xs">100%</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Debt Schedule</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Year", "EBITDA", "Interest", "Debt Balance"].map((h) => (
                      <th key={h} className={`py-2 px-2 text-xs text-muted-foreground font-medium ${h === "Year" ? "text-left" : "text-right"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lbo.years.map((y) => (
                    <tr key={y.year} className="border-b border-border/50">
                      <td className="py-1.5 px-2 font-mono text-xs">Year {y.year}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(y.ebitda * 1e6)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(y.interestExpense * 1e6)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-xs">{formatVal(y.debtBalance * 1e6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

const DCFCalculator = (props: DCFCompanyProps) => {
  return (
    <Tabs defaultValue="dcf" className="space-y-4">
      <TabsList className="bg-muted/30 border border-border">
        <TabsTrigger value="dcf" className="text-xs">DCF Model</TabsTrigger>
        <TabsTrigger value="lbo" className="text-xs">LBO Model</TabsTrigger>
      </TabsList>
      <TabsContent value="dcf">
        {/* DCF Formula Reference */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3 mb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">Model Formula</p>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            EV = Σ(FCFₜ / (1 + WACC)ᵗ) + TV / (1 + WACC)ⁿ &nbsp;|&nbsp; TV = FCFₙ × (1 + g) / (WACC − g) &nbsp;|&nbsp; WACC = Rf + β × ERP
          </p>
        </div>
        <DCFTab {...props} />
      </TabsContent>
      <TabsContent value="lbo"><LBOTab {...props} /></TabsContent>
    </Tabs>
  );
};

export default DCFCalculator;
