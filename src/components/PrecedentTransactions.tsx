import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (v: number | null) => {
  if (!v) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
};

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

  const avgEvRev = filtered.length ? filtered.reduce((s, t) => s + (t.ev_revenue ?? 0), 0) / filtered.filter((t) => t.ev_revenue).length : 0;
  const avgEvEbitda = filtered.length ? filtered.reduce((s, t) => s + (t.ev_ebitda ?? 0), 0) / filtered.filter((t) => t.ev_ebitda).length : 0;

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

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border bg-card"><CardContent className="pt-3 text-center">
          <p className="text-[10px] text-muted-foreground">Transactions</p>
          <p className="text-lg font-bold font-mono">{filtered.length}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="pt-3 text-center">
          <p className="text-[10px] text-muted-foreground">Avg EV/Revenue</p>
          <p className="text-lg font-bold font-mono text-primary">{avgEvRev ? `${avgEvRev.toFixed(1)}x` : "—"}</p>
        </CardContent></Card>
        <Card className="border-border bg-card"><CardContent className="pt-3 text-center">
          <p className="text-[10px] text-muted-foreground">Avg EV/EBITDA</p>
          <p className="text-lg font-bold font-mono text-primary">{avgEvEbitda ? `${avgEvEbitda.toFixed(1)}x` : "—"}</p>
        </CardContent></Card>
      </div>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Target", "Acquirer", "Sector", "Deal Value", "EV/Rev", "EV/EBITDA"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3 font-mono text-xs">{t.deal_date ?? "—"}</td>
                    <td className="py-2 px-3 text-xs font-medium">{t.target_company_name}</td>
                    <td className="py-2 px-3 text-xs">{t.acquirer_company_name}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{t.sector ?? "—"}</td>
                    <td className="py-2 px-3 font-mono text-xs">{formatCurrency(t.deal_value)}</td>
                    <td className="py-2 px-3 font-mono text-xs">{t.ev_revenue ? `${t.ev_revenue.toFixed(1)}x` : "—"}</td>
                    <td className="py-2 px-3 font-mono text-xs">{t.ev_ebitda ? `${t.ev_ebitda.toFixed(1)}x` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrecedentTransactions;
