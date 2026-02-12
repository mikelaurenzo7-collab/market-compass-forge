import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardMetrics, formatCurrency } from "@/hooks/useData";
import MetricCard from "@/components/MetricCard";
import CompanyTable from "@/components/CompanyTable";
import { DealFlowChart, SectorHeatmap } from "@/components/Charts";
import NewsFeed from "@/components/NewsFeed";
import UsageMeters from "@/components/UsageMeters";
import { CardSkeleton } from "@/components/SkeletonLoaders";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, FileText, ArrowRight, List, Lock, Settings2, AlertTriangle, Building } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHotkeys } from "@/hooks/useHotkeys";

const OnboardingCard = () => {
  const navigate = useNavigate();
  const steps = [
    { icon: Search, label: "Screen companies", desc: "Filter by sector, stage, revenue, and valuation", action: () => navigate("/watchlists") },
    { icon: FileText, label: "Research with AI", desc: "Chat with AI about any company or generate memos", action: () => navigate("/research") },
    { icon: TrendingUp, label: "Build your pipeline", desc: "Track deals through sourcing to commitment", action: () => navigate("/deals") },
  ];

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Welcome to Laurenzo's Grapevine</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Elite private investment intelligence platform</p>
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
  const { data: recentDeals, isLoading } = useQuery({
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
      {isLoading ? (
        <div className="divide-y divide-border/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 h-12 bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
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
      )}
    </div>
  );
};

const WatchlistWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: watchlists, isLoading } = useQuery({
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
        <button onClick={() => navigate("/watchlists")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">Manage</button>
      </div>
      {isLoading ? (
        <div className="divide-y divide-border/50">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 h-10 bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {watchlists.map((w) => (
            <div key={w.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <List className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{w.name}</span>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{w.company_ids?.length ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DistressedWidget = () => {
  const navigate = useNavigate();
  const { data: assets } = useQuery({
    queryKey: ["distressed-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("distressed_assets").select("id, name, asset_type, asking_price, discount_pct, distress_type, status").eq("status", "active").order("listed_date", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  if (!assets?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Distressed Opportunities</h3>
        </div>
        <button onClick={() => navigate("/distressed")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">View All</button>
      </div>
      <div className="divide-y divide-border/50">
        {assets.map((a) => (
          <div key={a.id} onClick={() => navigate("/distressed")} className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors">
            <div>
              <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{a.asset_type} · {a.distress_type?.replace('_', ' ')}</p>
            </div>
            <span className="text-xs font-mono font-medium text-warning shrink-0">{a.discount_pct}% off</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const OffMarketWidget = () => {
  const navigate = useNavigate();
  const { data: listings } = useQuery({
    queryKey: ["listings-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("private_listings").select("id, property_type, city, state, asking_price, estimated_cap_rate, listing_type").eq("status", "available").order("listed_date", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  if (!listings?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Off-Market Properties</h3>
        </div>
        <button onClick={() => navigate("/real-estate")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">View All</button>
      </div>
      <div className="divide-y divide-border/50">
        {listings.map((l) => (
          <div key={l.id} onClick={() => navigate("/real-estate")} className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors">
            <div>
              <p className="text-sm font-medium text-foreground truncate">{l.property_type} · {l.city}, {l.state}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{l.listing_type?.replace('_', ' ')}</p>
            </div>
            <span className="text-xs font-mono font-medium text-foreground shrink-0">
              {l.estimated_cap_rate ? `${l.estimated_cap_rate}% cap` : formatCurrency(l.asking_price)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Index = () => {
  const { data: metrics, isLoading } = useDashboardMetrics();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customizingDashboard, setCustomizingDashboard] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([
    "watchlist", "deal-flow", "sector-heatmap", "pipeline", "distressed", "off-market", "intelligence-feed"
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("dashboard-widgets");
    if (saved) {
      try { setVisibleWidgets(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const updateWidgets = (widgets: string[]) => {
    setVisibleWidgets(widgets);
    localStorage.setItem("dashboard-widgets", JSON.stringify(widgets));
    toast.success("Dashboard updated");
  };

  const toggleWidget = (id: string) => {
    if (visibleWidgets.includes(id)) updateWidgets(visibleWidgets.filter(w => w !== id));
    else updateWidgets([...visibleWidgets, id]);
  };

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
      const [companiesRes, sectorRes, distressedRes, listingsRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("sector").not("sector", "is", null),
        supabase.from("distressed_assets").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("private_listings").select("id", { count: "exact", head: true }).eq("status", "available"),
      ]);
      const sectorSet = new Set((sectorRes.data ?? []).map((r) => r.sector));
      return {
        companyCount: companiesRes.count ?? 0,
        sectorCount: sectorSet.size,
        distressedCount: distressedRes.count ?? 0,
        listingsCount: listingsRes.count ?? 0,
      };
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
    : "Private Investment Intelligence";

  useHotkeys([{
    meta: true, shift: true, key: "d",
    handler: () => setCustomizingDashboard(prev => !prev),
    description: "Toggle dashboard customization"
  }]);

  const allWidgets = [
    { id: "watchlist", label: "Watchlists" },
    { id: "deal-flow", label: "Deal Flow Chart" },
    { id: "sector-heatmap", label: "Sector Heatmap" },
    { id: "pipeline", label: "Your Pipeline" },
    { id: "distressed", label: "Distressed Opportunities" },
    { id: "off-market", label: "Off-Market Properties" },
    { id: "intelligence-feed", label: "Intelligence Feed" },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Market Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{freshnessLabel}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCustomizingDashboard(!customizingDashboard)} className="gap-1">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">{customizingDashboard ? "Done" : "Customize"}</span>
        </Button>
      </div>

      {customizingDashboard && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-fadeIn">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Dashboard Widgets</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {allWidgets.map(widget => (
              <button key={widget.id} onClick={() => toggleWidget(widget.id)}
                className={`text-left px-3 py-2 rounded-md border transition-colors ${visibleWidgets.includes(widget.id) ? "border-primary bg-primary/10 text-foreground" : "border-border bg-muted/30 text-muted-foreground"}`}>
                <span className="text-sm font-medium">{widget.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showOnboarding && <OnboardingCard />}

      {/* Metrics Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard label="Total Deal Value" value={formatCurrency(metrics?.totalDealValue ?? 0)} subtitle={`${metrics?.totalRounds ?? 0} rounds`} />
          <MetricCard label="Private Companies" value={String(totalCounts?.companyCount ?? 0)} subtitle={<span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Tracked</span>} />
          <MetricCard label="Distressed Alerts" value={String(totalCounts?.distressedCount ?? 0)} subtitle={<span className="flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Active</span>} />
          <MetricCard label="Off-Market Listings" value={String(totalCounts?.listingsCount ?? 0)} subtitle={<span className="flex items-center gap-1"><Building className="h-2.5 w-2.5" /> Available</span>} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.includes("deal-flow") && <div className="min-h-[300px]"><DealFlowChart /></div>}
        {visibleWidgets.includes("sector-heatmap") && <div className="min-h-[300px]"><SectorHeatmap /></div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Companies</h3>
              <button onClick={() => navigate("/companies")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">View All</button>
            </div>
            <CompanyTable />
          </div>
        </div>

        <div className="space-y-4">
          <UsageMeters />
          {visibleWidgets.includes("watchlist") && <WatchlistWidget />}
          {visibleWidgets.includes("pipeline") && <RecentPipelineDeals />}
          {visibleWidgets.includes("distressed") && <DistressedWidget />}
          {visibleWidgets.includes("off-market") && <OffMarketWidget />}
          {visibleWidgets.includes("intelligence-feed") && <NewsFeed compact />}
        </div>
      </div>
    </div>
  );
};

export default Index;
