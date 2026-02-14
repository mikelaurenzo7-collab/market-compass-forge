import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { TrendingUp, BarChart3 } from "lucide-react";

const formatCurrency = (v: number | null) => {
  if (!v) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
};

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
};

const AnimatedStatCard = ({ label, value, sub, index, highlight }: { label: string; value: string; sub?: string; index: number; highlight?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
  >
    <Card className={`border-border bg-card ${highlight ? "border-primary/20" : ""}`}>
      <CardContent className="pt-3 text-center">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold font-mono ${highlight ? "text-primary" : "text-foreground"}`}>{value}</p>
        {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  </motion.div>
);

const PrecedentTransactions = () => {
  const [sectorFilter, setSectorFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: txns, isLoading } = useQuery({
    queryKey: ["precedent-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("precedent_transactions")
        .select("*")
        .order("deal_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sectors = [...new Set((txns ?? []).map((t) => t.sector).filter(Boolean))];

  const filtered = (txns ?? []).filter((t) => {
    if (sectorFilter !== "all" && t.sector !== sectorFilter) return false;
    if (search && !t.target_company_name.toLowerCase().includes(search.toLowerCase()) && !t.acquirer_company_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = useMemo(() => {
    const evRevValues = filtered.map(t => t.ev_revenue).filter((v): v is number => v !== null && v > 0).sort((a, b) => a - b);
    const evEbitdaValues = filtered.map(t => t.ev_ebitda).filter((v): v is number => v !== null && v > 0).sort((a, b) => a - b);

    const compute = (sorted: number[]) => {
      if (sorted.length === 0) return { mean: 0, median: 0, p25: 0, p75: 0, count: 0 };
      return {
        mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        median: percentile(sorted, 50),
        p25: percentile(sorted, 25),
        p75: percentile(sorted, 75),
        count: sorted.length,
      };
    };

    const evRevStats = compute(evRevValues);
    const evRevIQR = evRevStats.p75 - evRevStats.p25;
    const evRevOutlierHigh = evRevStats.p75 + evRevIQR * 2;

    const byYear: Record<string, number> = {};
    filtered.forEach(t => {
      if (t.deal_date) {
        const year = t.deal_date.substring(0, 4);
        byYear[year] = (byYear[year] || 0) + 1;
      }
    });

    return {
      evRev: evRevStats,
      evEbitda: compute(evEbitdaValues),
      evRevOutlierHigh,
      byYear: Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [filtered]);

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search target or acquirer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 h-8 text-sm bg-background" />
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Sectors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map((s) => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Animated stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <AnimatedStatCard label="Transactions" value={String(filtered.length)} index={0} />
        <AnimatedStatCard label="Median EV/Rev" value={stats.evRev.median ? `${stats.evRev.median.toFixed(1)}x` : "—"} sub={`Mean: ${stats.evRev.mean ? `${stats.evRev.mean.toFixed(1)}x` : "—"}`} index={1} highlight />
        <AnimatedStatCard label="EV/Rev P25–P75" value={`${stats.evRev.p25 ? stats.evRev.p25.toFixed(1) : "—"}–${stats.evRev.p75 ? stats.evRev.p75.toFixed(1) : "—"}x`} index={2} />
        <AnimatedStatCard label="Median EV/EBITDA" value={stats.evEbitda.median ? `${stats.evEbitda.median.toFixed(1)}x` : "—"} sub={`Mean: ${stats.evEbitda.mean ? `${stats.evEbitda.mean.toFixed(1)}x` : "—"}`} index={3} highlight />
        <AnimatedStatCard label="EV/EBITDA P25–P75" value={`${stats.evEbitda.p25 ? stats.evEbitda.p25.toFixed(1) : "—"}–${stats.evEbitda.p75 ? stats.evEbitda.p75.toFixed(1) : "—"}x`} index={4} />
      </div>

      {/* Animated deal volume chart */}
      {stats.byYear.length > 0 && (
        <div className="flex items-end gap-1 px-2">
          {stats.byYear.map(([year, count], i) => {
            const maxCount = Math.max(...stats.byYear.map(([, c]) => c));
            const height = Math.max(8, (count / maxCount) * 48);
            return (
              <motion.div
                key={year}
                className="flex flex-col items-center gap-0.5"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "bottom" }}
              >
                <span className="text-[9px] font-mono text-muted-foreground">{count}</span>
                <div
                  className="w-9 rounded-t bg-gradient-to-t from-primary/80 to-primary/40"
                  style={{ height: `${height}px` }}
                />
                <span className="text-[9px] font-mono text-muted-foreground">{year.slice(2)}</span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Target", "Acquirer", "Sector", "Deal Value", "EV/Rev", "EV/EBITDA"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const isOutlier = t.ev_revenue !== null && t.ev_revenue > stats.evRevOutlierHigh;
                  return (
                    <motion.tr
                      key={t.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${isOutlier ? 'bg-warning/5' : ''}`}
                    >
                      <td className="py-2 px-3 font-mono text-xs">{t.deal_date ?? "—"}</td>
                      <td className="py-2 px-3 text-xs font-medium">{t.target_company_name}</td>
                      <td className="py-2 px-3 text-xs">{t.acquirer_company_name}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">{t.sector ?? "—"}</td>
                      <td className="py-2 px-3 font-mono text-xs">{formatCurrency(t.deal_value)}</td>
                      <td className={`py-2 px-3 font-mono text-xs ${isOutlier ? 'text-warning font-semibold' : ''}`}>
                        {t.ev_revenue ? `${t.ev_revenue.toFixed(1)}x` : "—"}
                        {isOutlier && <span className="ml-1 text-[9px]">⚠</span>}
                      </td>
                      <td className="py-2 px-3 font-mono text-xs">{t.ev_ebitda ? `${t.ev_ebitda.toFixed(1)}x` : "—"}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrecedentTransactions;
