import { useEffect, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  Handshake,
  Sparkles,
  Clock,
  ArrowRight,
  Users,
  TrendingUp,
  Briefcase,
  Target,
  AlertTriangle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";

const STAGE_LABELS: Record<string, string> = {
  sourced: "Sourced",
  screening: "Screening",
  due_diligence: "Due Diligence",
  ic_review: "IC Review",
  committed: "Committed",
  passed: "Passed",
};

const STAGE_COLORS: Record<string, string> = {
  sourced: "bg-muted-foreground/20 text-muted-foreground",
  screening: "bg-primary/15 text-primary",
  due_diligence: "bg-warning/15 text-warning",
  ic_review: "bg-chart-4/15 text-chart-4",
  committed: "bg-success/15 text-success",
  passed: "bg-destructive/15 text-destructive",
};

const useDealsOverviewData = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deals-overview", user?.id],
    queryFn: async () => {
      const [pipelineRes, matcherRes, activityRes] = await Promise.all([
        supabase
          .from("deal_pipeline")
          .select("id, stage, priority, updated_at, created_at, companies(id, name, sector, stage)")
          .eq("user_id", user!.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("distressed_assets")
          .select("id, name, asset_type, discount_pct, distress_type, status")
          .eq("status", "active")
          .order("listed_date", { ascending: false })
          .limit(5),
        supabase
          .from("activity_events")
          .select("id, action, entity_type, entity_name, published_at")
          .order("published_at", { ascending: false })
          .limit(8),
      ]);

      const deals = pipelineRes.data ?? [];
      const activeDeals = deals.filter((d) => d.stage !== "passed" && d.stage !== "committed");
      const closingSoon = deals.filter((d) => {
        if (d.stage === "ic_review" || d.stage === "committed") return true;
        const daysSinceUpdate = differenceInDays(new Date(), new Date(d.updated_at));
        return d.stage === "due_diligence" && daysSinceUpdate <= 14;
      });

      return {
        activeDeals,
        closingSoon,
        allDeals: deals,
        distressedMatches: matcherRes.data ?? [],
        recentActivity: activityRes.data ?? [],
        totalCount: deals.length,
        activeCount: activeDeals.length,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
};

const DealCard = ({ deal, onClick }: { deal: any; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors group"
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
        {deal.companies?.name ?? "Unknown"}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        {deal.companies?.sector ?? "—"}
      </p>
    </div>
    <div className="flex items-center gap-2 shrink-0 ml-3">
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${STAGE_COLORS[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
        {STAGE_LABELS[deal.stage] ?? deal.stage}
      </span>
      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </button>
);

const SectionCard = ({ title, count, icon: Icon, action, actionLabel, children }: {
  title: string;
  count?: number;
  icon: typeof Handshake;
  action?: () => void;
  actionLabel?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border bg-card overflow-hidden">
    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            {count}
          </span>
        )}
      </div>
      {action && actionLabel && (
        <button
          onClick={action}
          className="text-[10px] font-mono text-primary uppercase tracking-wider hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
    {children}
  </div>
);

const DealsOverview = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useDealsOverviewData();

  useEffect(() => {
    const channel = supabase
      .channel("deals-overview-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_pipeline" }, () => {
        queryClient.invalidateQueries({ queryKey: ["deals-overview"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
          className="relative overflow-hidden rounded-xl glass-premium p-5 sm:p-6"
        >
          <div className="absolute inset-0 aurora-gradient opacity-50 pointer-events-none" />
          <div className="relative">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Deals
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data
                ? `${data.activeCount} active deals · ${data.totalCount} total in pipeline`
                : "Your deal pipeline at a glance"}
            </p>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Active Deals"
            value={data?.activeCount ?? 0}
            icon={<Handshake className="h-4 w-4" />}
            onClick={() => navigate("/deals/flow")}
          />
          <StatCard
            label="Closing Soon"
            value={data?.closingSoon?.length ?? 0}
            icon={<Clock className="h-4 w-4" />}
            accent="warning"
          />
          <StatCard
            label="New Matches"
            value={data?.distressedMatches?.length ?? 0}
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => navigate("/deals/recommended")}
          />
          <StatCard
            label="Pipeline Total"
            value={data?.totalCount ?? 0}
            icon={<Briefcase className="h-4 w-4" />}
            onClick={() => navigate("/deals/flow")}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Active Deals - 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <SectionCard
              title="Active Deals"
              count={data?.activeDeals?.length}
              icon={Target}
              action={() => navigate("/deals/flow")}
              actionLabel="View Pipeline"
            >
              {isLoading ? (
                <div className="divide-y divide-border/50">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-4 py-3">
                      <Skeleton className="h-4 w-40 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : data?.activeDeals?.length ? (
                <div className="divide-y divide-border/50">
                  {data.activeDeals.slice(0, 8).map((deal: any) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Handshake}
                  title="No active deals"
                  description="Start by browsing companies or running the AI matcher to find opportunities."
                  actionLabel="Browse Companies"
                  onAction={() => navigate("/companies")}
                  secondaryLabel="AI Match"
                  onSecondary={() => navigate("/deals/recommended")}
                />
              )}
            </SectionCard>

            {/* Closing Soon */}
            {(data?.closingSoon?.length ?? 0) > 0 && (
              <SectionCard
                title="Closing Soon"
                count={data?.closingSoon?.length}
                icon={Clock}
              >
                <div className="divide-y divide-border/50">
                  {data!.closingSoon.slice(0, 5).map((deal: any) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                    />
                  ))}
                </div>
              </SectionCard>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* New Matches / Recommended */}
            <SectionCard
              title="Recommended"
              count={data?.distressedMatches?.length}
              icon={Sparkles}
              action={() => navigate("/deals/recommended")}
              actionLabel="View All"
            >
              {(data?.distressedMatches?.length ?? 0) > 0 ? (
                <div className="divide-y divide-border/50">
                  {data!.distressedMatches.slice(0, 4).map((asset: any) => (
                    <button
                      key={asset.id}
                      onClick={() => navigate("/distressed")}
                      className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{asset.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {asset.asset_type} · {asset.distress_type?.replace("_", " ")}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-medium text-warning shrink-0 ml-2">
                        {asset.discount_pct}% off
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">Run AI matcher for personalized recommendations</p>
                  <button
                    onClick={() => navigate("/deals/recommended")}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Get Recommendations
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Room Activity */}
            <SectionCard
              title="Recent Activity"
              icon={TrendingUp}
            >
              {(data?.recentActivity?.length ?? 0) > 0 ? (
                <div className="divide-y divide-border/50">
                  {data!.recentActivity.slice(0, 5).map((event: any) => (
                    <div key={event.id} className="px-4 py-2.5">
                      <p className="text-xs text-foreground">
                        <span className="font-medium">{event.entity_name}</span>
                        {" "}
                        <span className="text-muted-foreground">{event.action}</span>
                      </p>
                      {event.published_at && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(event.published_at), "MMM d, h:mm a")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-xs text-muted-foreground">Deal activity will appear here</p>
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

function StatCard({ label, value, icon, accent, onClick }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "warning" | "success" | "destructive";
  onClick?: () => void;
}) {
  const colorClass = accent === "warning"
    ? "text-warning"
    : accent === "success"
    ? "text-success"
    : accent === "destructive"
    ? "text-destructive"
    : "text-foreground";

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/30 transition-colors disabled:cursor-default"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-xl font-semibold font-mono ${colorClass}`}>
        {value}
      </div>
    </button>
  );
}

export default DealsOverview;
