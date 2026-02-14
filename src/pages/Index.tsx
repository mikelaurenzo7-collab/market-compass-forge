import { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardMetrics, formatCurrency } from "@/hooks/useData";
import MetricCard from "@/components/MetricCard";
import CompanyTable from "@/components/CompanyTable";
import UsageMeters from "@/components/UsageMeters";
import { CardSkeleton } from "@/components/SkeletonLoaders";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, FileText, ArrowRight, List, Lock, Settings2, AlertTriangle, Building, Briefcase, Bell, Zap, Globe } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHotkeys } from "@/hooks/useHotkeys";
import OnboardingFlow, { useOnboardingStatus } from "@/components/OnboardingFlow";
import EmptyState from "@/components/EmptyState";
import { AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveIndicator } from "@/components/LiveIndicator";

// Lazy load heavy chart components
const DealFlowChart = lazy(() => import("@/components/Charts").then(m => ({ default: m.DealFlowChart })));
const SectorHeatmap = lazy(() => import("@/components/Charts").then(m => ({ default: m.SectorHeatmap })));
const NewsFeed = lazy(() => import("@/components/NewsFeed"));
const AlphaSignalWidget = lazy(() => import("@/components/AlphaSignalWidget"));
const MorningBriefing = lazy(() => import("@/components/MorningBriefing"));

const ChartSkeleton = () => (
  <div className="rounded-lg border border-border bg-card p-4 space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  </div>
);

const WidgetSkeleton = () => (
  <div className="rounded-lg border border-border bg-card">
    <div className="px-4 py-3 border-b border-border">
      <Skeleton className="h-4 w-28" />
    </div>
    <div className="divide-y divide-border/50">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  </div>
);

// Batched dashboard data hook — single query for pipeline count, latest event, and market counts
const useDashboardBatch = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-batch", user?.id],
    queryFn: async () => {
      const [pipelineRes, companiesRes, distressedRes, listingsRes, sectorRes, latestEventRes] = await Promise.all([
        user ? supabase.from("deal_pipeline").select("*", { count: "exact", head: true }).eq("user_id", user.id) : Promise.resolve({ count: 0 }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("distressed_assets").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("private_listings").select("id", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("companies").select("sector").not("sector", "is", null),
        supabase.from("activity_events").select("published_at").order("published_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      const sectorSet = new Set((sectorRes.data ?? []).map((r: any) => r.sector));
      return {
        pipelineCount: (pipelineRes as any).count ?? 0,
        companyCount: companiesRes.count ?? 0,
        distressedCount: distressedRes.count ?? 0,
        listingsCount: listingsRes.count ?? 0,
        sectorCount: sectorSet.size,
        latestEventDate: latestEventRes.data?.published_at ?? null,
      };
    },
    staleTime: 30_000,
  });
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

  if (!recentDeals?.length) return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Your Pipeline</h3>
      </div>
      <EmptyState
        icon={Briefcase}
        title="No deals yet"
        description="Start tracking deals by adding companies to your pipeline."
        actionLabel="Add First Deal"
        onAction={() => navigate("/companies")}
      />
    </div>
  );

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

  if (!watchlists?.length) return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Watchlists</h3>
      </div>
      <EmptyState
        icon={List}
        title="No watchlists yet"
        description="Create watchlists to track companies by sector, theme, or strategy."
        actionLabel="Create Watchlist"
        onAction={() => navigate("/watchlists")}
      />
    </div>
  );

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

const DataSourcesBadge = () => {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Data Sources</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-muted/30 p-2">
          <p className="text-xs font-semibold text-foreground">SEC EDGAR</p>
          <p className="text-[10px] text-muted-foreground">Public Filings</p>
        </div>
        <div className="rounded-md bg-muted/30 p-2">
          <p className="text-xs font-semibold text-foreground">Firecrawl</p>
          <p className="text-[10px] text-muted-foreground">Web Intelligence</p>
        </div>
        <div className="rounded-md bg-muted/30 p-2">
          <p className="text-xs font-semibold text-foreground">Proprietary</p>
          <p className="text-[10px] text-muted-foreground">Private Markets</p>
        </div>
      </div>
    </div>
  );
};

const GlobalPulseWidget = () => {
  const navigate = useNavigate();
  const { data: opportunities } = useQuery({
    queryKey: ["global-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("global_opportunities").select("id, name, region, country, deal_value_usd, opportunity_type, risk_rating").eq("status", "active").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  if (!opportunities?.length) return null;

  const fmt = (v: number | null) => {
    if (!v) return "—";
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
    return `$${v.toLocaleString()}`;
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Global Pulse</h3>
        </div>
        <button onClick={() => navigate("/global")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">View All</button>
      </div>
      <div className="divide-y divide-border/50">
        {opportunities.map((o: any) => (
          <div key={o.id} onClick={() => navigate("/global")} className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors">
            <div>
              <p className="text-sm font-medium text-foreground truncate">{o.name}</p>
              <p className="text-[10px] text-muted-foreground">{o.country} · {o.region}</p>
            </div>
            <span className="text-xs font-mono font-medium text-foreground shrink-0">{fmt(o.deal_value_usd)}</span>
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
  const queryClient = useQueryClient();
  const { data: batch } = useDashboardBatch();

  // Realtime: refresh dashboard when activity events or signals change
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_events' }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-batch"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'intelligence_signals' }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-batch"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const [customizingDashboard, setCustomizingDashboard] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([
    "morning-briefing", "alpha-signals", "watchlist", "deal-flow", "sector-heatmap", "pipeline", "distressed", "off-market", "intelligence-feed"
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

  const { data: onboardingCompleted } = useOnboardingStatus();
  const showOnboarding = !onboardingCompleted;
  const freshnessLabel = batch?.latestEventDate
    ? `Data as of ${format(new Date(batch.latestEventDate), "MMM d, yyyy")}`
    : "Private Investment Intelligence";

  useHotkeys([{
    meta: true, shift: true, key: "d",
    handler: () => setCustomizingDashboard(prev => !prev),
    description: "Toggle dashboard customization"
  }]);

  const allWidgets = [
    { id: "morning-briefing", label: "Morning Briefing" },
    { id: "alpha-signals", label: "Alpha Signals" },
    { id: "watchlist", label: "Watchlists" },
    { id: "deal-flow", label: "Deal Flow Chart" },
    { id: "sector-heatmap", label: "Sector Heatmap" },
    { id: "pipeline", label: "Your Pipeline" },
    { id: "distressed", label: "Distressed Opportunities" },
    { id: "off-market", label: "Off-Market Properties" },
    { id: "intelligence-feed", label: "Intelligence Feed" },
    { id: "global-pulse", label: "Global Pulse" },
  ];

   return (
     <div className="p-4 sm:p-6 space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h1 className="text-xl font-semibold text-foreground">Market Intelligence</h1>
           <p className="text-sm text-muted-foreground mt-0.5">{freshnessLabel}</p>
         </div>
         <div className="flex items-center gap-3">
           <LiveIndicator />
           <Button variant="outline" size="sm" onClick={() => setCustomizingDashboard(!customizingDashboard)} className="gap-1">
             <Settings2 className="h-4 w-4" />
           <span className="hidden sm:inline">{customizingDashboard ? "Done" : "Customize"}</span>
         </Button>
       </div>
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

      <AnimatePresence>
        {showOnboarding && <OnboardingFlow />}
      </AnimatePresence>

      {/* Morning Briefing */}
      {visibleWidgets.includes("morning-briefing") && (
        <Suspense fallback={<ChartSkeleton />}>
          <MorningBriefing />
        </Suspense>
      )}

      {/* Alpha Signals */}
      {visibleWidgets.includes("alpha-signals") && (
        <Suspense fallback={<ChartSkeleton />}>
          <AlphaSignalWidget />
        </Suspense>
      )}

      {/* Data Sources */}
      <DataSourcesBadge />

      {/* Metrics Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard label="Total Deal Value" value={formatCurrency(metrics?.totalDealValue ?? 0)} subtitle={`${metrics?.totalRounds ?? 0} rounds`} />
          <MetricCard label="Private Companies" value={String(batch?.companyCount ?? 0)} subtitle={<span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Tracked</span>} />
          <MetricCard label="Distressed Alerts" value={String(batch?.distressedCount ?? 0)} subtitle={<span className="flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Active</span>} />
          <MetricCard label="Off-Market Listings" value={String(batch?.listingsCount ?? 0)} subtitle={<span className="flex items-center gap-1"><Building className="h-2.5 w-2.5" /> Available</span>} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWidgets.includes("deal-flow") && (
          <Suspense fallback={<ChartSkeleton />}>
            <div className="min-h-[300px]"><DealFlowChart /></div>
          </Suspense>
        )}
        {visibleWidgets.includes("sector-heatmap") && (
          <Suspense fallback={<ChartSkeleton />}>
            <div className="min-h-[300px]"><SectorHeatmap /></div>
          </Suspense>
        )}
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
          {visibleWidgets.includes("global-pulse") && <GlobalPulseWidget />}
          {visibleWidgets.includes("intelligence-feed") && (
            <Suspense fallback={<WidgetSkeleton />}>
              <NewsFeed compact />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
