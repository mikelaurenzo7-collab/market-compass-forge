import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import MetricCard from "@/components/MetricCard";
import { formatCurrency } from "@/hooks/useData";
import { BarChart3, Database, Users, Zap, Clock, Shield, TrendingUp, Globe, FileText, Activity } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const useInvestorMetrics = () => {
  return useQuery({
    queryKey: ["investor-metrics"],
    queryFn: async () => {
      const [
        companiesRes,
        financialsRes,
        fundingRes,
        distressedRes,
        listingsRes,
        fundsRes,
        globalRes,
        signalsRes,
        newsRes,
        usersRes,
        docsRes,
        latestActivity,
        latestSignal,
        latestNews,
      ] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("financials").select("id", { count: "exact", head: true }),
        supabase.from("funding_rounds").select("id", { count: "exact", head: true }),
        supabase.from("distressed_assets").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("private_listings").select("id", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("funds").select("id", { count: "exact", head: true }),
        supabase.from("global_opportunities").select("id", { count: "exact", head: true }),
        supabase.from("intelligence_signals").select("id", { count: "exact", head: true }),
        supabase.from("news_articles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("document_analyses").select("id", { count: "exact", head: true }),
        supabase.from("activity_events").select("published_at").order("published_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("intelligence_signals").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("news_articles").select("published_at").order("published_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      // Company sector coverage
      const { data: sectorData } = await supabase
        .from("companies")
        .select("sector")
        .not("sector", "is", null);
      const sectorCounts: Record<string, number> = {};
      sectorData?.forEach((c: any) => {
        if (c.sector) sectorCounts[c.sector] = (sectorCounts[c.sector] || 0) + 1;
      });

      // Financials coverage
      const { data: companiesWithFinancials } = await supabase
        .from("financials")
        .select("company_id")
        .limit(10000);
      const uniqueCompaniesWithFin = new Set(companiesWithFinancials?.map((f: any) => f.company_id)).size;

      return {
        totalCompanies: companiesRes.count ?? 0,
        totalFinancials: financialsRes.count ?? 0,
        totalFundingRounds: fundingRes.count ?? 0,
        activeDistressed: distressedRes.count ?? 0,
        activeListings: listingsRes.count ?? 0,
        totalFunds: fundsRes.count ?? 0,
        totalGlobal: globalRes.count ?? 0,
        totalSignals: signalsRes.count ?? 0,
        totalNews: newsRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        totalDocs: docsRes.count ?? 0,
        companiesWithFinancials: uniqueCompaniesWithFin,
        financialsCoverage: companiesRes.count ? Math.round((uniqueCompaniesWithFin / companiesRes.count) * 100) : 0,
        sectorCounts,
        freshness: {
          activity: latestActivity.data?.published_at ?? null,
          signals: latestSignal.data?.created_at ?? null,
          news: latestNews.data?.published_at ?? null,
        },
      };
    },
    staleTime: 60_000,
  });
};

const FreshnessRow = ({ label, timestamp }: { label: string; timestamp: string | null }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-mono text-foreground">
      {timestamp ? formatDistanceToNow(new Date(timestamp), { addSuffix: true }) : "—"}
    </span>
  </div>
);

const InvestorMetrics = () => {
  const { data: m, isLoading } = useInvestorMetrics();

  const topSectors = m
    ? Object.entries(m.sectorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    : [];

  return (
    <PageTransition>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Platform Metrics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live platform KPIs for internal tracking and investor reporting
          </p>
        </div>

        {/* Key KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Total Companies" value={String(m?.totalCompanies ?? "—")} subtitle="Private + Public" />
          <MetricCard label="Funding Rounds" value={String(m?.totalFundingRounds ?? "—")} subtitle="Tracked" />
          <MetricCard label="Distressed Assets" value={String(m?.activeDistressed ?? "—")} subtitle="Active" />
          <MetricCard label="Registered Users" value={String(m?.totalUsers ?? "—")} subtitle="All time" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Data Coverage */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Data Coverage</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Companies with financials</span>
                  <span className="font-mono text-foreground">{m?.financialsCoverage ?? 0}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${m?.financialsCoverage ?? 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {m?.companiesWithFinancials ?? 0} / {m?.totalCompanies ?? 0} companies
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-lg font-bold font-mono text-foreground">{m?.totalFinancials ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Financial Records</p>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-lg font-bold font-mono text-foreground">{m?.totalNews ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">News Articles</p>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-lg font-bold font-mono text-foreground">{m?.totalSignals ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Intel Signals</p>
                </div>
                <div className="rounded-md bg-muted/30 p-2">
                  <p className="text-lg font-bold font-mono text-foreground">{m?.totalDocs ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Doc Analyses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Freshness */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Data Freshness</h3>
            </div>
            <div className="space-y-0">
              <FreshnessRow label="Activity Events" timestamp={m?.freshness.activity ?? null} />
              <FreshnessRow label="Intelligence Signals" timestamp={m?.freshness.signals ?? null} />
              <FreshnessRow label="News Articles" timestamp={m?.freshness.news ?? null} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-2">
              <div className="rounded-md bg-muted/30 p-2">
                <p className="text-lg font-bold font-mono text-foreground">{m?.totalFunds ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Funds Tracked</p>
              </div>
              <div className="rounded-md bg-muted/30 p-2">
                <p className="text-lg font-bold font-mono text-foreground">{m?.totalGlobal ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Global Opps</p>
              </div>
            </div>
          </div>

          {/* Top Sectors */}
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Sector Distribution</h3>
            </div>
            <div className="space-y-2">
              {topSectors.map(([sector, count]) => {
                const maxCount = topSectors[0]?.[1] ?? 1;
                const pct = Math.round((count / (maxCount as number)) * 100);
                return (
                  <div key={sector}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground truncate">{sector}</span>
                      <span className="font-mono text-foreground shrink-0">{count as number}</span>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Platform Capabilities Summary */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Platform Capabilities</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {[
              { label: "Off-Market Listings", value: m?.activeListings ?? 0, icon: "🏗️" },
              { label: "Data Sources", value: "3+", icon: "📡" },
              { label: "API Endpoints", value: "14", icon: "⚡" },
              { label: "AI Models", value: "Gemini + GPT", icon: "🤖" },
            ].map((cap) => (
              <div key={cap.label} className="rounded-md bg-muted/30 p-3">
                <p className="text-lg mb-1">{cap.icon}</p>
                <p className="text-sm font-bold font-mono text-foreground">{String(cap.value)}</p>
                <p className="text-[10px] text-muted-foreground">{cap.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default InvestorMetrics;
