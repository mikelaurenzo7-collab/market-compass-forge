import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardMetrics, formatCurrency, usePublicMarketMovers } from "@/hooks/useData";
import MetricCard from "@/components/MetricCard";
import CompanyTable from "@/components/CompanyTable";
import { DealFlowChart, SectorHeatmap } from "@/components/Charts";
import ActivityFeed from "@/components/ActivityFeed";
import { MetricsSkeleton, TableSkeleton } from "@/components/SkeletonLoaders";
import { useNavigate } from "react-router-dom";
import MarketToggle, { type MarketFilter } from "@/components/MarketToggle";
import { Search, TrendingUp, TrendingDown, FileText, ArrowRight, List, Building2, Globe, Lock } from "lucide-react";
import { format } from "date-fns";

const OnboardingCard = () => {
  const navigate = useNavigate();
  const steps = [
    { icon: Search, label: "Screen companies", desc: "Filter by sector, stage, ARR, and valuation", action: () => navigate("/screening") },
    { icon: FileText, label: "Research with AI", desc: "Chat with AI about any company or generate memos", action: () => navigate("/research") },
    { icon: TrendingUp, label: "Build your pipeline", desc: "Track deals through sourcing to commitment", action: () => navigate("/deals") },
  ];

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Welcome to Laurenzo's Grapevine</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Your AI-powered intelligence platform for private & public markets</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <button key={i} onClick={step.action} className="flex items-start gap-3 p-3 rounded-md border border-border bg-card hover:bg-secondary/50 transition-colors text-left group">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <step.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1">{step.label} <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" /></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{step.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const RecentPipelineDeals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: recentDeals } = useQuery({
    queryKey: ["recent-pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_pipeline").select("id, stage, updated_at, companies(name, sector)").eq("user_id", user!.id).order("updated_at", { ascending: false }).limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!recentDeals?.length) return null;

  const STAGE_LABELS: Record<string, string> = { sourced: "Sourced", screening: "Screening", due_diligence: "Due Diligence", ic_review: "IC Review", committed: "Committed", passed: "Passed" };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Your Pipeline</h3>
        <button onClick={() => navigate("/deals")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">View All</button>
      </div>
      <div className="divide-y divide-border/50">
        {recentDeals.map((d: any) => (
          <div key={d.id} onClick={() => navigate("/deals")} className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors">
            <div>
              <p className="text-sm font-medium text-foreground">{d.companies?.name ?? "Unknown"}</p>
              <p className="text-[11px] text-muted-foreground">{d.companies?.sector ?? ""}</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">{STAGE_LABELS[d.stage] ?? d.stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WatchlistWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: watchlists } = useQuery({
    queryKey: ["dashboard-watchlists"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_watchlists").select("id, name, company_ids").eq("user_id", user!.id).order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!watchlists?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Watchlists</h3>
        <button onClick={() => navigate("/screening")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">Manage</button>
      </div>
      <div className="divide-y divide-border/50">
        {watchlists.map((w) => (
          <div key={w.id} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{w.name}</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{w.company_ids?.length ?? 0} companies</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PublicMarketSnapshot = () => {
  const navigate = useNavigate();
  const { data: movers } = usePublicMarketMovers();

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Public Market Movers</h3>
        </div>
        <button onClick={() => navigate("/markets/public")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">View All</button>
      </div>
      <div className="divide-y divide-border/50">
        {movers?.gainers.slice(0, 3).map((g: any) => (
          <div key={g.id} onClick={() => navigate(`/companies/${g.company_id}`)} className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-10">{g.ticker}</span>
              <span className="text-sm font-medium text-foreground">{g.companies?.name}</span>
            </div>
            <span className="text-xs font-mono font-medium text-green-500">+{g.price_change_pct?.toFixed(2)}%</span>
          </div>
        ))}
        {movers?.losers.slice(0, 2).map((g: any) => (
          <div key={g.id} onClick={() => navigate(`/companies/${g.company_id}`)} className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-10">{g.ticker}</span>
              <span className="text-sm font-medium text-foreground">{g.companies?.name}</span>
            </div>
            <span className="text-xs font-mono font-medium text-red-500">{g.price_change_pct?.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Index = () => {
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { user } = useAuth();

  const { data: pipelineCount } = useQuery({
    queryKey: ["pipeline-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("deal_pipeline").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: totalCounts } = useQuery({
    queryKey: ["market-counts"],
    queryFn: async () => {
      const [privateRes, publicRes, sectorRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("market_type", "private"),
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("market_type", "public"),
        supabase.from("companies").select("sector").not("sector", "is", null),
      ]);
      const sectorSet = new Set((sectorRes.data ?? []).map((r) => r.sector));
      return { privateCount: privateRes.count ?? 0, publicCount: publicRes.count ?? 0, sectorCount: sectorSet.size };
    },
    staleTime: 60_000,
  });

  const { data: latestEventDate } = useQuery({
    queryKey: ["latest-event-date"],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_events").select("published_at").order("published_at", { ascending: false }).limit(1).single();
      if (error) return null;
      return data?.published_at;
    },
    staleTime: 60_000,
  });

  const showOnboarding = pipelineCount === 0;

  const freshnessLabel = latestEventDate
    ? `Data as of ${format(new Date(latestEventDate), "MMM d, yyyy")}`
    : "Private & Public Market Intelligence";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Market Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{freshnessLabel}</p>
        </div>
      </div>

      {showOnboarding && <OnboardingCard />}

      {isLoading ? (
        <MetricsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Deal Value" value={formatCurrency(metrics?.totalDealValue ?? 0)} subtitle={`${metrics?.totalRounds ?? 0} rounds`} />
          <MetricCard label="Private Companies" value={String(totalCounts?.privateCount ?? 0)} subtitle={<span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Tracked</span>} />
          <MetricCard label="Public Companies" value={String(totalCounts?.publicCount ?? 0)} subtitle={<span className="flex items-center gap-1"><Globe className="h-2.5 w-2.5" /> Tracked</span>} />
          <MetricCard label="Sectors" value={String(totalCounts?.sectorCount ?? "—")} subtitle="Covered" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DealFlowChart />
        <SectorHeatmap />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <CompanyTable />
        </div>
        <div className="space-y-4">
          <PublicMarketSnapshot />
          <RecentPipelineDeals />
          <WatchlistWidget />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default Index;
