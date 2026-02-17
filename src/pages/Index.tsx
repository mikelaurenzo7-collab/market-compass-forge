import { useEffect, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CompanyTable from "@/components/CompanyTable";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  List,
} from "lucide-react";
import { format } from "date-fns";
import OnboardingFlow, { useOnboardingStatus } from "@/components/OnboardingFlow";
import EmptyState from "@/components/EmptyState";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import FeatureTooltip from "@/components/FeatureTooltip";
import QuickActions from "@/components/QuickActions";
import DashboardCustomizer from "@/components/DashboardCustomizer";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";

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

// Batched dashboard data hook
const useDashboardBatch = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard-batch", user?.id],
    queryFn: async () => {
      const [pipelineRes, privateRes, distressedRes, latestEventRes] = await Promise.all([
        user
          ? supabase.from("deal_pipeline").select("*", { count: "exact", head: true }).eq("user_id", user.id)
          : Promise.resolve({ count: 0 }),
        supabase
          .from("companies")
          .select("id", { count: "exact", head: true })
          .or("market_type.eq.private,market_type.is.null"),
        supabase.from("distressed_assets").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase
          .from("activity_events")
          .select("published_at")
          .order("published_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        pipelineCount: (pipelineRes as any).count ?? 0,
        privateCount: privateRes.count ?? 0,
        distressedCount: distressedRes.count ?? 0,
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
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("id, stage, updated_at, companies(name, sector)")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!recentDeals?.length)
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Your Pipeline</h3>
        </div>
        <EmptyState
          icon={Briefcase}
          title="No deals in pipeline"
          description="Browse companies, filter by sector and stage, then save opportunities."
          actionLabel="Browse Companies"
          onAction={() => navigate("/companies")}
          secondaryLabel="AI Match"
          onSecondary={() => navigate("/deal-matcher")}
        />
      </div>
    );

  const STAGE_LABELS: Record<string, string> = {
    sourced: "Watching",
    screening: "Interested",
    due_diligence: "Diligencing",
    ic_review: "Soft Commit",
    committed: "Committed",
    passed: "Passed",
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Your Pipeline</h3>
        <button
          onClick={() => navigate("/deals")}
          className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline"
        >
          View All
        </button>
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
            <div
              key={d.id}
              onClick={() => navigate("/deals")}
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{d.companies?.name ?? "Unknown"}</p>
                <p className="text-[11px] text-muted-foreground">{d.companies?.sector ?? ""}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                {STAGE_LABELS[d.stage] ?? d.stage}
              </span>
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
      const { data, error } = await supabase
        .from("user_watchlists")
        .select("id, name, company_ids")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!watchlists?.length)
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Watchlists</h3>
        </div>
        <EmptyState
          icon={List}
          title="No watchlists yet"
          description="Group companies by sector, theme, or strategy. Get alerts when new intel surfaces."
          actionLabel="Build Watchlist"
          onAction={() => navigate("/companies")}
        />
      </div>
    );

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Watchlists</h3>
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
      const { data, error } = await supabase
        .from("distressed_assets")
        .select("id, name, asset_type, asking_price, discount_pct, distress_type, status")
        .eq("status", "active")
        .order("listed_date", { ascending: false })
        .limit(5);
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
        <button
          onClick={() => navigate("/distressed")}
          className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline"
        >
          View All
        </button>
      </div>
      <div className="divide-y divide-border/50">
        {assets.map((a) => (
          <div
            key={a.id}
            onClick={() => navigate("/distressed")}
            className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {a.asset_type} · {a.distress_type?.replace("_", " ")}
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-warning shrink-0">{a.discount_pct}% off</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Widget component map
const MorningBriefingWidget = () => (
  <FeatureTooltip featureId="morning-briefing" tip="Pro tip: Customize your daily briefing content and frequency in Settings → Briefing." side="bottom">
    <div>
      <Suspense fallback={<ChartSkeleton />}>
        <MorningBriefing />
      </Suspense>
    </div>
  </FeatureTooltip>
);

const AlphaSignalsWidget = () => (
  <Suspense fallback={<ChartSkeleton />}>
    <AlphaSignalWidget />
  </Suspense>
);

const CompaniesTableWidget = () => {
  const navigate = useNavigate();
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Companies</h3>
        <button onClick={() => navigate("/companies")} className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline">
          View All
        </button>
      </div>
      <CompanyTable />
    </div>
  );
};

const NewsWireWidget = () => (
  <Suspense fallback={<WidgetSkeleton />}>
    <NewsFeed compact />
  </Suspense>
);

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  "morning-briefing": MorningBriefingWidget,
  "quick-actions": QuickActions,
  "alpha-signals": AlphaSignalsWidget,
  "companies-table": CompaniesTableWidget,
  "pipeline-deals": RecentPipelineDeals,
  "watchlists": WatchlistWidget,
  "distressed": DistressedWidget,
  "news-wire": NewsWireWidget,
};

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: batch } = useDashboardBatch();
  const { showUpgrade, blockedAction, dismissUpgrade } = useUsageTracking();
  const { widgets, fullWidgets, mainWidgets, sidebarWidgets, updateWidgets, resetToDefaults } = useDashboardLayout();

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-batch"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "intelligence_signals" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dashboard-batch"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: onboardingCompleted } = useOnboardingStatus();
  const showOnboarding = !onboardingCompleted;
  const freshnessLabel = batch?.latestEventDate
    ? `Data as of ${format(new Date(batch.latestEventDate), "MMM d, yyyy")}`
    : "Private Investment Intelligence";

  const hasSidebar = sidebarWidgets.length > 0;

  const renderWidget = (widgetId: string) => {
    const Component = WIDGET_COMPONENTS[widgetId];
    return Component ? <Component key={widgetId} /> : null;
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        className="relative overflow-hidden rounded-xl glass-premium p-5 sm:p-6"
      >
        <div className="absolute inset-0 aurora-gradient opacity-50 pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
              className="text-xl sm:text-2xl font-bold text-foreground tracking-tight"
            >
              Command Center
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-sm text-muted-foreground mt-0.5">
              {freshnessLabel}
            </motion.p>
          </div>
          <DashboardCustomizer widgets={widgets} onSave={updateWidgets} onReset={resetToDefaults} />
        </div>
      </motion.div>

      <UpgradePrompt open={showUpgrade} onClose={dismissUpgrade} blockedAction={blockedAction} />
      <AnimatePresence>{showOnboarding && <OnboardingFlow />}</AnimatePresence>

      {/* Full-width widgets */}
      {fullWidgets.map((w) => renderWidget(w.id))}

      {/* Empty state when all widgets hidden */}
      {fullWidgets.length === 0 && mainWidgets.length === 0 && sidebarWidgets.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Your dashboard is empty.</p>
          <p className="text-xs text-muted-foreground">Click <strong>Customize</strong> above to add widgets.</p>
        </div>
      )}

      {/* Main content grid */}
      <div className={`grid grid-cols-1 ${hasSidebar ? "lg:grid-cols-3" : ""} gap-3 sm:gap-4`}>
        {mainWidgets.length > 0 && (
          <div className={hasSidebar ? "lg:col-span-2" : ""}>
            {mainWidgets.map((w) => renderWidget(w.id))}
          </div>
        )}
        {hasSidebar && (
          <div className="space-y-3 sm:space-y-4">
            {sidebarWidgets.map((w) => renderWidget(w.id))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
