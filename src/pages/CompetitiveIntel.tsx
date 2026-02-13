import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Crosshair, TrendingUp, TrendingDown, Newspaper, DollarSign, Loader2, Building2, ArrowUpRight, Filter, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import CompanyAvatar from "@/components/CompanyAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { subDays, formatDistanceToNow } from "date-fns";

type CompetitorSignal = {
  id: string;
  companyName: string;
  companyId: string;
  sector: string;
  signalType: "funding" | "news" | "deal" | "filing";
  headline: string;
  detail: string;
  value: number | null;
  sentiment: string;
  timestamp: string;
};

const useCompetitiveIntel = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["competitive-intel", user?.id],
    queryFn: async () => {
      const { data: pipelineDeals } = await supabase
        .from("deal_pipeline")
        .select("companies(id, name, sector)")
        .eq("user_id", user!.id);

      const { data: watchlists } = await supabase
        .from("user_watchlists")
        .select("company_ids")
        .eq("user_id", user!.id);

      const pipelineSectors = new Set(
        (pipelineDeals ?? []).map((d: any) => d.companies?.sector).filter(Boolean)
      );
      const pipelineCompanyIds = new Set(
        (pipelineDeals ?? []).map((d: any) => d.companies?.id).filter(Boolean)
      );
      const watchlistCompanyIds = new Set(
        (watchlists ?? []).flatMap((w: any) => w.company_ids ?? [])
      );

      const targetSectors = [...pipelineSectors];
      if (targetSectors.length === 0) {
        targetSectors.push("AI/ML", "Fintech", "Enterprise SaaS", "Cybersecurity", "Healthcare");
      }

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      const dateOnly = thirtyDaysAgo.split("T")[0];

      const [recentFunding, recentNews, recentDeals] = await Promise.all([
        supabase
          .from("funding_rounds")
          .select("id, company_id, round_type, amount, date, companies(name, sector)")
          .gte("date", dateOnly)
          .order("date", { ascending: false })
          .limit(100),
        supabase
          .from("news_articles")
          .select("id, title, company_id, sentiment_label, published_at, companies(name, sector)")
          .gte("published_at", thirtyDaysAgo)
          .order("published_at", { ascending: false })
          .limit(100),
        supabase
          .from("deal_transactions")
          .select("id, target_company, target_industry, deal_value, deal_type, announced_date")
          .gte("announced_date", dateOnly)
          .order("announced_date", { ascending: false })
          .limit(50),
      ]);

      const signals: CompetitorSignal[] = [];

      (recentFunding.data ?? []).forEach((r: any) => {
        const sector = r.companies?.sector;
        if (!sector || !targetSectors.includes(sector)) return;
        if (pipelineCompanyIds.has(r.company_id) || watchlistCompanyIds.has(r.company_id)) return;
        signals.push({
          id: `fund-${r.id}`,
          companyName: r.companies?.name ?? "Unknown",
          companyId: r.company_id,
          sector,
          signalType: "funding",
          headline: `${r.companies?.name} raised ${formatCurrency(r.amount)} (${r.round_type})`,
          detail: `Competitor in ${sector} secured ${r.round_type} funding`,
          value: r.amount,
          sentiment: "neutral",
          timestamp: r.date,
        });
      });

      (recentNews.data ?? []).forEach((n: any) => {
        const sector = n.companies?.sector;
        if (!sector || !targetSectors.includes(sector)) return;
        if (pipelineCompanyIds.has(n.company_id) || watchlistCompanyIds.has(n.company_id)) return;
        signals.push({
          id: `news-${n.id}`,
          companyName: n.companies?.name ?? "Industry",
          companyId: n.company_id ?? "",
          sector,
          signalType: "news",
          headline: n.title,
          detail: `Sentiment: ${n.sentiment_label ?? "neutral"}`,
          value: null,
          sentiment: n.sentiment_label ?? "neutral",
          timestamp: n.published_at,
        });
      });

      (recentDeals.data ?? []).forEach((d: any) => {
        const industry = d.target_industry;
        if (!industry || !targetSectors.some((s) => industry.toLowerCase().includes(s.toLowerCase()))) return;
        signals.push({
          id: `deal-${d.id}`,
          companyName: d.target_company,
          companyId: "",
          sector: industry,
          signalType: "deal",
          headline: `${d.target_company} — ${d.deal_type} at ${formatCurrency(d.deal_value)}`,
          detail: `${d.deal_type} transaction in ${industry}`,
          value: d.deal_value,
          sentiment: "neutral",
          timestamp: d.announced_date,
        });
      });

      signals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const sectorSummary: Record<string, { funding: number; deals: number; newsCount: number; sentiment: number }> = {};
      // Initialize all target sectors so cards always show
      targetSectors.forEach((s) => {
        sectorSummary[s] = { funding: 0, deals: 0, newsCount: 0, sentiment: 0 };
      });
      signals.forEach((s) => {
        if (!sectorSummary[s.sector]) sectorSummary[s.sector] = { funding: 0, deals: 0, newsCount: 0, sentiment: 0 };
        if (s.signalType === "funding") sectorSummary[s.sector].funding += s.value ?? 0;
        if (s.signalType === "deal") sectorSummary[s.sector].deals++;
        if (s.signalType === "news") {
          sectorSummary[s.sector].newsCount++;
          sectorSummary[s.sector].sentiment += s.sentiment === "bullish" ? 1 : s.sentiment === "bearish" ? -1 : 0;
        }
      });

      return {
        signals: signals.slice(0, 50),
        sectorSummary: Object.entries(sectorSummary)
          .map(([sector, data]) => ({ sector, ...data }))
          .sort((a, b) => (b.funding + b.newsCount * 1000) - (a.funding + a.newsCount * 1000)),
        targetSectors,
        totalSignals: signals.length,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
};

const signalIcon = (type: string) => {
  switch (type) {
    case "funding": return <DollarSign className="h-3.5 w-3.5" />;
    case "news": return <Newspaper className="h-3.5 w-3.5" />;
    case "deal": return <Building2 className="h-3.5 w-3.5" />;
    default: return <Crosshair className="h-3.5 w-3.5" />;
  }
};

const signalColor = (type: string) => {
  switch (type) {
    case "funding": return "bg-primary/10 text-primary";
    case "news": return "bg-accent text-accent-foreground";
    case "deal": return "bg-secondary text-secondary-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const CompetitiveIntel = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useCompetitiveIntel();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <div className="h-8 w-64 bg-muted/30 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4 h-24 animate-pulse" />
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card p-4 h-96 animate-pulse" />
      </div>
    );
  }

  const signals = data?.signals ?? [];
  const sectorSummary = data?.sectorSummary ?? [];
  const filteredSignals = activeFilter ? signals.filter((s) => s.sector === activeFilter) : signals;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-primary" />
            Competitive Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track competitor movements across your target sectors · <span className="font-mono text-primary">{data?.totalSignals ?? 0}</span> signals (30d)
          </p>
        </div>
        {activeFilter && (
          <Button variant="ghost" size="sm" onClick={() => setActiveFilter(null)} className="gap-1.5 text-xs">
            <Filter className="h-3 w-3" /> Clear filter
          </Button>
        )}
      </div>

      {/* Sector Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sectorSummary.slice(0, 4).map((s, i) => {
          const isActive = activeFilter === s.sector;
          const totalActivity = s.deals + s.newsCount;
          return (
            <motion.div
              key={s.sector}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActiveFilter(isActive ? null : s.sector)}
              className={`rounded-lg border bg-card p-4 space-y-2 cursor-pointer transition-all ${
                isActive ? "border-primary ring-1 ring-primary/20" : "border-border hover:border-primary/30"
              }`}
            >
              <p className="text-xs text-muted-foreground truncate">{s.sector}</p>
              <p className="text-lg font-bold font-mono text-foreground">
                {s.funding > 0 ? formatCurrency(s.funding) : `${totalActivity} signals`}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{s.deals} deals</span>
                <span>{s.newsCount} news</span>
                <span className={s.sentiment > 0 ? "text-primary" : s.sentiment < 0 ? "text-destructive" : ""}>
                  {s.sentiment > 0 ? "↑" : s.sentiment < 0 ? "↓" : "→"} sentiment
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Signal Feed */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Live Signal Feed
            {activeFilter && <span className="text-primary ml-2">· {activeFilter}</span>}
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {filteredSignals.length} signals · Last 30 days
          </span>
        </div>
        <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
          {filteredSignals.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {activeFilter ? `No signals for ${activeFilter}` : "No competitor signals yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeFilter
                    ? "Try clearing the filter or check back later."
                    : "Add companies to your pipeline to start tracking competitor movements."}
                </p>
              </div>
            </div>
          ) : (
            filteredSignals.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => s.companyId && navigate(`/companies/${s.companyId}`)}
              >
                <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${signalColor(s.signalType)}`}>
                  {signalIcon(s.signalType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-foreground">{s.companyName}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">{s.sector}</Badge>
                    {s.sentiment === "bullish" && <TrendingUp className="h-3 w-3 text-primary" />}
                    {s.sentiment === "bearish" && <TrendingDown className="h-3 w-3 text-destructive" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.headline}</p>
                </div>
                <div className="text-right shrink-0">
                  {s.value && <p className="text-xs font-mono font-medium text-foreground">{formatCurrency(s.value)}</p>}
                  <p className="text-[10px] text-muted-foreground">
                    {s.timestamp ? formatDistanceToNow(new Date(s.timestamp), { addSuffix: true }) : "—"}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CompetitiveIntel;
