import { useEffect } from "react";
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
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/PageTransition";
import EmptyState from "@/components/EmptyState";

// ── Interest-state labels for the pipeline ──────────────────────────────
const INTEREST_LABELS: Record<string, string> = {
  sourced: "Watching",
  screening: "Interested",
  due_diligence: "Diligencing",
  ic_review: "Soft Commit",
  committed: "Committed",
  passed: "Passed",
};

const INTEREST_ICONS: Record<string, typeof Eye> = {
  sourced: Eye,
  screening: Target,
  due_diligence: FileText,
  ic_review: TrendingUp,
  committed: CheckCircle2,
  passed: XCircle,
};

const INTEREST_COLORS: Record<string, string> = {
  sourced: "bg-muted/50 text-muted-foreground",
  screening: "bg-primary/10 text-primary",
  due_diligence: "bg-warning/10 text-warning",
  ic_review: "bg-chart-4/10 text-chart-4",
  committed: "bg-success/10 text-success",
  passed: "bg-destructive/10 text-destructive",
};

// ── Data ────────────────────────────────────────────────────────────────
const useDealsOverviewData = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deals-overview", user?.id],
    queryFn: async () => {
      const [pipelineRes, matcherRes, activityRes] = await Promise.all([
        supabase
          .from("deal_pipeline")
          .select("id, stage, priority, updated_at, created_at, notes, companies(id, name, sector, stage)")
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
      const activeDeals = deals.filter((d) => d.stage !== "passed");
      const inDiligence = deals.filter((d) => d.stage === "due_diligence" || d.stage === "ic_review");
      const closingSoon = deals.filter((d) => {
        if (d.stage === "committed") return true;
        const daysSinceUpdate = differenceInDays(new Date(), new Date(d.updated_at));
        return d.stage === "ic_review" && daysSinceUpdate <= 14;
      });

      // Group by stage for the summary bar
      const stageCounts: Record<string, number> = {};
      deals.forEach((d) => { stageCounts[d.stage] = (stageCounts[d.stage] ?? 0) + 1; });

      return {
        activeDeals,
        inDiligence,
        closingSoon,
        allDeals: deals,
        distressedMatches: matcherRes.data ?? [],
        recentActivity: activityRes.data ?? [],
        totalCount: deals.length,
        activeCount: activeDeals.length,
        stageCounts,
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
};

// ── Deal Card ───────────────────────────────────────────────────────────
const DealCard = ({ deal, onClick }: { deal: any; onClick: () => void }) => {
  const Icon = INTEREST_ICONS[deal.stage] ?? Eye;
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {deal.companies?.name ?? "Unknown"}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {deal.companies?.sector && (
            <span className="text-[10px] text-muted-foreground">{deal.companies.sector}</span>
          )}
          {deal.updated_at && (
            <>
              <span className="text-[10px] text-muted-foreground/40">·</span>
              <span className="text-[10px] text-muted-foreground/60">
                {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${INTEREST_COLORS[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
          <Icon className="h-2.5 w-2.5" />
          {INTEREST_LABELS[deal.stage] ?? deal.stage}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
};

// ── Section Card ────────────────────────────────────────────────────────
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
          className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5"
        >
          {actionLabel} <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
    {children}
  </div>
);

// ── Stage Summary Bar ───────────────────────────────────────────────────
const StageSummaryBar = ({ stageCounts, total, onNavigate }: {
  stageCounts: Record<string, number>;
  total: number;
  onNavigate: () => void;
}) => {
  const stages = ["sourced", "screening", "due_diligence", "ic_review", "committed", "passed"];
  const barColors: Record<string, string> = {
    sourced: "bg-muted-foreground/30",
    screening: "bg-primary/60",
    due_diligence: "bg-warning/60",
    ic_review: "bg-chart-4/60",
    committed: "bg-success/60",
    passed: "bg-destructive/40",
  };

  if (total === 0) return null;

  return (
    <button onClick={onNavigate} className="w-full group">
      <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
        {stages.map((stage) => {
          const count = stageCounts[stage] ?? 0;
          if (count === 0) return null;
          return (
            <div
              key={stage}
              className={`${barColors[stage]} transition-all group-hover:opacity-80`}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${INTEREST_LABELS[stage]}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-3">
          {stages.filter((s) => (stageCounts[s] ?? 0) > 0).map((stage) => (
            <span key={stage} className="text-[9px] text-muted-foreground flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${barColors[stage]}`} />
              {INTEREST_LABELS[stage]} ({stageCounts[stage]})
            </span>
          ))}
        </div>
        <span className="text-[9px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          View Pipeline →
        </span>
      </div>
    </button>
  );
};

// ── Main Component ──────────────────────────────────────────────────────
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
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Deals</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data
              ? `${data.activeCount} active · ${data.totalCount} total in pipeline`
              : "Your deal pipeline at a glance"}
          </p>
        </div>

        {/* Pipeline Summary Bar */}
        {data && data.totalCount > 0 && (
          <StageSummaryBar
            stageCounts={data.stageCounts}
            total={data.totalCount}
            onNavigate={() => navigate("/deals/flow")}
          />
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Active"
            value={data?.activeCount ?? 0}
            icon={<Handshake className="h-4 w-4" />}
            onClick={() => navigate("/deals/flow")}
          />
          <StatCard
            label="In Diligence"
            value={data?.inDiligence?.length ?? 0}
            icon={<FileText className="h-4 w-4" />}
            accent="warning"
          />
          <StatCard
            label="Closing"
            value={data?.closingSoon?.length ?? 0}
            icon={<Clock className="h-4 w-4" />}
            accent="success"
          />
          <StatCard
            label="AI Matches"
            value={data?.distressedMatches?.length ?? 0}
            icon={<Sparkles className="h-4 w-4" />}
            onClick={() => navigate("/deals/recommended")}
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
              actionLabel="Pipeline"
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

            {/* In Diligence */}
            {(data?.inDiligence?.length ?? 0) > 0 && (
              <SectionCard
                title="In Diligence"
                count={data?.inDiligence?.length}
                icon={FileText}
              >
                <div className="divide-y divide-border/50">
                  {data!.inDiligence.slice(0, 5).map((deal: any) => (
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
            {/* Room Activity */}
            <SectionCard
              title="Rooms"
              icon={Users}
              action={() => navigate("/rooms")}
              actionLabel="View All"
            >
              <div className="p-4 space-y-2">
                {["Series B Syndicate", "Distressed Credit Club", "Climate Tech Scouts"].map((room, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/rooms/room-${i + 1}`)}
                    className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-secondary/30 transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-md bg-grape/10 flex items-center justify-center shrink-0">
                      <Users className="h-3 w-3 text-grape" />
                    </div>
                    <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {room}
                    </span>
                  </button>
                ))}
              </div>
            </SectionCard>

            {/* Recommended */}
            <SectionCard
              title="AI Matches"
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
                  <Sparkles className="h-5 w-5 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Run AI matcher for thesis-based recommendations</p>
                  <button
                    onClick={() => navigate("/deals/recommended")}
                    className="mt-2 text-xs text-primary hover:underline font-medium"
                  >
                    Get Recommendations
                  </button>
                </div>
              )}
            </SectionCard>

            {/* Recent Activity */}
            <SectionCard
              title="Activity"
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
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 font-mono">
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

// ── Stat Card ───────────────────────────────────────────────────────────
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
      className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/20 transition-all disabled:cursor-default group"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-semibold font-mono ${colorClass}`}>
        {value}
      </div>
    </button>
  );
}

export default DealsOverview;
