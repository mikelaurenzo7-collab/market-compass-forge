import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (v: number | null) => {
  if (!v) return "—";
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
};

const dealTypeColors: Record<string, string> = {
  LBO: "bg-primary/10 text-primary border-primary/20",
  "M&A": "bg-chart-1/10 text-chart-1 border-chart-1/20",
  Growth: "bg-success/10 text-success border-success/20",
  "Add-on": "bg-warning/10 text-warning border-warning/20",
};

const DealTransactionsTable = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");

  const { data: deals, isLoading } = useQuery({
    queryKey: ["deal-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_transactions")
        .select("*")
        .order("announced_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const dealTypes = [...new Set((deals ?? []).map((d) => d.deal_type))];
  const industries = [...new Set((deals ?? []).map((d) => d.target_industry).filter(Boolean))];

  const filtered = useMemo(() => {
    return (deals ?? []).filter((d) => {
      if (typeFilter !== "all" && d.deal_type !== typeFilter) return false;
      if (industryFilter !== "all" && d.target_industry !== industryFilter) return false;
      if (search && !d.target_company.toLowerCase().includes(search.toLowerCase()) && !(d.acquirer_investor ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [deals, typeFilter, industryFilter, search]);

  const totalValue = filtered.reduce((s, d) => s + (d.deal_value ?? 0), 0);
  const avgEvEbitda = filtered.filter((d) => d.ev_ebitda).reduce((s, d) => s + (d.ev_ebitda ?? 0), 0) / (filtered.filter((d) => d.ev_ebitda).length || 1);
  const avgEvRev = filtered.filter((d) => d.ev_revenue).reduce((s, d) => s + (d.ev_revenue ?? 0), 0) / (filtered.filter((d) => d.ev_revenue).length || 1);

  if (isLoading) return <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Deals", value: filtered.length },
          { label: "Aggregate Value", value: formatCurrency(totalValue) },
          { label: "Avg EV/EBITDA", value: `${avgEvEbitda.toFixed(1)}x` },
          { label: "Avg EV/Revenue", value: `${avgEvRev.toFixed(1)}x` },
        ].map((s) => (
          <Card key={s.label} className="border-border bg-card">
            <CardContent className="pt-3 text-center">
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold font-mono">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input placeholder="Search target or acquirer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 h-8 text-sm bg-background" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deal Types</SelectItem>
            {dealTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="All Industries" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((i) => <SelectItem key={i!} value={i!}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Target", "Industry", "Type", "Value", "Acquirer/Investor", "EV/Rev", "EV/EBITDA", "Status"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3 font-mono text-xs">{d.announced_date ?? "—"}</td>
                    <td className="py-2 px-3 text-xs font-medium">{d.target_company}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{d.target_industry ?? "—"}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className={`text-[10px] ${dealTypeColors[d.deal_type] ?? ""}`}>{d.deal_type}</Badge>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{formatCurrency(d.deal_value)}</td>
                    <td className="py-2 px-3 text-xs">{d.acquirer_investor ?? "—"}</td>
                    <td className="py-2 px-3 font-mono text-xs">{d.ev_revenue ? `${d.ev_revenue.toFixed(1)}x` : "—"}</td>
                    <td className="py-2 px-3 font-mono text-xs">{d.ev_ebitda ? `${d.ev_ebitda.toFixed(1)}x` : "—"}</td>
                    <td className="py-2 px-3">
                      <Badge variant={d.status === "closed" ? "default" : "secondary"} className="text-[10px]">{d.status}</Badge>
                    </td>
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

export default DealTransactionsTable;
