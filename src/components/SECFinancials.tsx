import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { SECFinancialFact, groupFactsByConcept, getConceptLabel } from "@/hooks/useSECFilings";
import { DataBadge } from "@/components/DataBadges";
import { BarChart3 } from "lucide-react";

const COLORS = [
  "hsl(192, 91%, 52%)", // cyan
  "hsl(142, 60%, 45%)", // green
  "hsl(38, 92%, 50%)",  // amber
  "hsl(262, 80%, 60%)", // purple
  "hsl(0, 80%, 55%)",   // red
];

const formatValue = (val: number) => {
  const abs = Math.abs(val);
  if (abs >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(2)}`;
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-md border border-border px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-foreground">
          {p.name}: <span style={{ color: p.color }}>{formatValue(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

interface SECFinancialsProps {
  facts: SECFinancialFact[];
  companyName: string;
}

const SECFinancials = ({ facts, companyName }: SECFinancialsProps) => {
  // Only use 10-K (annual) for cleaner charts
  const annualFacts = useMemo(() => facts.filter((f) => f.form_type === "10-K"), [facts]);
  const grouped = useMemo(() => groupFactsByConcept(annualFacts), [annualFacts]);

  // Key income statement items
  const revenueKey = grouped["Revenues"]?.length
    ? "Revenues"
    : grouped["RevenueFromContractWithCustomerExcludingAssessedTax"]?.length
    ? "RevenueFromContractWithCustomerExcludingAssessedTax"
    : null;

  const incomeStatementConcepts = [revenueKey, "NetIncomeLoss", "GrossProfit", "OperatingIncomeLoss"].filter(Boolean) as string[];
  const balanceSheetConcepts = ["Assets", "StockholdersEquity", "LongTermDebt", "CashAndCashEquivalentsAtCarryingValue"].filter((c) => grouped[c]?.length);

  // Build chart data — pivot by period_end year
  const buildChartData = (concepts: string[]) => {
    const periodMap: Record<string, Record<string, number>> = {};
    for (const concept of concepts) {
      for (const fact of grouped[concept] ?? []) {
        const year = fact.period_end.slice(0, 4);
        if (!periodMap[year]) periodMap[year] = {};
        periodMap[year][concept] = fact.value;
      }
    }
    return Object.entries(periodMap)
      .map(([year, vals]) => ({ year, ...vals }))
      .sort((a, b) => a.year.localeCompare(b.year))
      .slice(-10); // last 10 years
  };

  const incomeData = buildChartData(incomeStatementConcepts);
  const balanceData = buildChartData(balanceSheetConcepts);

  if (incomeData.length < 2 && balanceData.length < 2) return null;

  return (
    <div className="space-y-4">
      {incomeData.length >= 2 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Income Statement (SEC XBRL)</h3>
            <DataBadge source="real" className="ml-auto" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={incomeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={formatValue} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {incomeStatementConcepts.map((concept, i) => (
                <Bar key={concept} dataKey={concept} fill={COLORS[i % COLORS.length]} name={getConceptLabel(concept)} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {balanceData.length >= 2 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Balance Sheet (SEC XBRL)</h3>
            <DataBadge source="real" className="ml-auto" />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={balanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={formatValue} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {balanceSheetConcepts.map((concept, i) => (
                <Line key={concept} type="monotone" dataKey={concept} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} name={getConceptLabel(concept)} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SECFinancials;
