import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, Database, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

interface DatasetStats {
  table: string;
  label: string;
  total: number;
  bySource: Record<string, number>;
  byVerification: Record<string, number>;
  syntheticCount: number;
  realCount: number;
  fresh7d: number;
  fresh30d: number;
  fresh90d: number;
}

const DATASETS: { table: string; label: string }[] = [
  { table: "companies", label: "Companies" },
  { table: "financials", label: "Financials" },
  { table: "funding_rounds", label: "Funding Rounds" },
  { table: "distressed_assets", label: "Distressed Assets" },
  { table: "global_opportunities", label: "Global Opportunities" },
  { table: "deal_transactions", label: "Deal Transactions" },
  { table: "cre_market_data", label: "CRE Market Data" },
  { table: "cre_transactions", label: "CRE Transactions" },
  { table: "funds", label: "Funds" },
  { table: "activity_events", label: "Activity Events" },
  { table: "company_enrichments", label: "Enrichments" },
];

async function fetchDatasetStats(table: string): Promise<Omit<DatasetStats, "label">> {
  const { data, error } = await supabase
    .from(table as any)
    .select("source_type, verification_status, fetched_at, is_synthetic");
  if (error) throw error;

  const records = (data ?? []) as any[];
  const bySource: Record<string, number> = {};
  const byVerification: Record<string, number> = {};
  let fresh7d = 0, fresh30d = 0, fresh90d = 0, syntheticCount = 0, realCount = 0;
  const now = Date.now();

  records.forEach((r) => {
    const st = r.source_type ?? "unknown";
    bySource[st] = (bySource[st] ?? 0) + 1;
    const vs = r.verification_status ?? "unknown";
    byVerification[vs] = (byVerification[vs] ?? 0) + 1;
    if (r.is_synthetic) syntheticCount++;
    else realCount++;
    const fetchedAt = r.fetched_at ?? r.scraped_at;
    if (fetchedAt) {
      const age = now - new Date(fetchedAt).getTime();
      const days = age / (24 * 60 * 60 * 1000);
      if (days <= 7) fresh7d++;
      if (days <= 30) fresh30d++;
      if (days <= 90) fresh90d++;
    }
  });

  return { table, total: records.length, bySource, byVerification, syntheticCount, realCount, fresh7d, fresh30d, fresh90d };
}

const AdminDataCoverage = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-data-coverage"],
    queryFn: async () => {
      const results = await Promise.all(
        DATASETS.map(async (ds) => {
          try {
            const s = await fetchDatasetStats(ds.table);
            return { ...s, label: ds.label };
          } catch {
            return { table: ds.table, label: ds.label, total: 0, bySource: {}, byVerification: {}, syntheticCount: 0, realCount: 0, fresh7d: 0, fresh30d: 0, fresh90d: 0 };
          }
        })
      );
      return results;
    },
    staleTime: 60_000,
  });

  const totalRecords = stats?.reduce((s, d) => s + d.total, 0) ?? 0;
  const totalVerified = stats?.reduce((s, d) => s + (d.byVerification["verified"] ?? 0), 0) ?? 0;
  const totalSynthetic = stats?.reduce((s, d) => s + d.syntheticCount, 0) ?? 0;
  const totalReal = stats?.reduce((s, d) => s + d.realCount, 0) ?? 0;
  const totalFresh30 = stats?.reduce((s, d) => s + d.fresh30d, 0) ?? 0;
  const verifiedPct = totalRecords > 0 ? Math.round((totalVerified / totalRecords) * 100) : 0;
  const freshPct = totalRecords > 0 ? Math.round((totalFresh30 / totalRecords) * 100) : 0;
  const realPct = totalRecords > 0 ? Math.round((totalReal / totalRecords) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-5 text-center">
            <Database className="h-6 w-6 text-primary mx-auto mb-1.5" />
            <p className="text-2xl font-black font-mono text-foreground">{totalRecords.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Records</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <CheckCircle className="h-6 w-6 text-success mx-auto mb-1.5" />
            <p className="text-2xl font-black font-mono text-success">{realPct}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Real Data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <AlertTriangle className="h-6 w-6 text-warning mx-auto mb-1.5" />
            <p className="text-2xl font-black font-mono text-warning">{totalRecords > 0 ? 100 - realPct : 0}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Synthetic</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <Shield className="h-6 w-6 text-primary mx-auto mb-1.5" />
            <p className="text-2xl font-black font-mono text-foreground">{verifiedPct}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-2xl font-black font-mono text-foreground">{freshPct}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Fresh (30d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-dataset breakdown */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Dataset</th>
              <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Records</th>
              <th className="text-center py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Real vs Synthetic</th>
              <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Sources</th>
              <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Verification</th>
              <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">7d</th>
              <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">30d</th>
            </tr>
          </thead>
          <tbody>
            {(stats ?? []).map((ds) => {
              const verPct = ds.total > 0 ? Math.round(((ds.byVerification["verified"] ?? 0) / ds.total) * 100) : 0;
              const dsRealPct = ds.total > 0 ? Math.round((ds.realCount / ds.total) * 100) : 0;
              return (
                <tr key={ds.table} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="py-2.5 px-3 font-medium text-foreground">{ds.label}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{ds.total.toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="flex h-2 w-24 rounded-full overflow-hidden bg-warning/20">
                        <div className="bg-success" style={{ width: `${dsRealPct}%` }} />
                      </div>
                      <span className={`text-[10px] font-mono ${dsRealPct > 50 ? "text-success" : "text-warning"}`}>{dsRealPct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(ds.bySource).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([src, count]) => (
                        <Badge key={src} variant="outline" className={`text-[9px] font-mono ${src === "seeded" ? "border-warning/30 text-warning" : ""}`}>
                          {src}: {count}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-2 w-20 rounded-full overflow-hidden bg-secondary">
                        <div className="bg-success" style={{ width: `${verPct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{verPct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">
                    <span className={ds.total > 0 && ds.fresh7d / ds.total > 0.5 ? "text-success" : "text-muted-foreground"}>
                      {ds.total > 0 ? Math.round((ds.fresh7d / ds.total) * 100) : 0}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">
                    {ds.total > 0 ? Math.round((ds.fresh30d / ds.total) * 100) : 0}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDataCoverage;
