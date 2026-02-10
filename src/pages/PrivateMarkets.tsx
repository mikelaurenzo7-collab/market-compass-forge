import { useAuth } from "@/hooks/useAuth";
import { useDashboardMetrics, formatCurrency, useDealFlowData } from "@/hooks/useData";
import MetricCard from "@/components/MetricCard";
import CompanyTable from "@/components/CompanyTable";
import { DealFlowChart, SectorHeatmap } from "@/components/Charts";
import ActivityFeed from "@/components/ActivityFeed";
import { MetricsSkeleton } from "@/components/SkeletonLoaders";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp, FileText, ArrowRight, List } from "lucide-react";

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
        <h2 className="text-sm font-semibold text-foreground">Welcome to Laurenzo</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Here's how to get started with your private market deal workflow</p>
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

const PrivateMarkets = () => {
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

  const showOnboarding = pipelineCount === 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Private Markets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Deal flow, pipeline, and private company intelligence</p>
      </div>

      {showOnboarding && <OnboardingCard />}

      {isLoading ? (
        <MetricsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Total Deal Value" value={formatCurrency(metrics?.totalDealValue ?? 0)} subtitle={`${metrics?.totalRounds ?? 0} rounds`} />
          <MetricCard label="Companies Tracked" value={(metrics?.totalCompanies ?? 0).toLocaleString()} subtitle="Private" />
          <MetricCard label="Median Valuation" value={formatCurrency(metrics?.medianValuation ?? 0)} subtitle="All rounds" />
          <MetricCard label="Active Rounds" value={String(metrics?.totalRounds ?? 0)} subtitle="In database" />
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
          <RecentPipelineDeals />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
};

export default PrivateMarkets;
