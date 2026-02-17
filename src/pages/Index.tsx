import { useEffect, lazy, Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  List,
  ArrowRight,
  Users,
  Target,
  Clock,
  Sparkles,
  TrendingUp,
  Bell,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  Handshake,
  ChevronRight,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import OnboardingFlow, { useOnboardingStatus } from "@/components/OnboardingFlow";
import EmptyState from "@/components/EmptyState";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useUsageTracking } from "@/hooks/useUsageTracking";

const NewsFeed = lazy(() => import("@/components/NewsFeed"));

// ── Interest state config ───────────────────────────────────────────────
const INTEREST_LABELS: Record<string, string> = {
  sourced: "Watching", screening: "Interested", due_diligence: "Diligencing",
  ic_review: "Soft Commit", committed: "Committed", passed: "Passed",
};
const INTEREST_ICONS: Record<string, typeof Eye> = {
  sourced: Eye, screening: Target, due_diligence: FileText,
  ic_review: TrendingUp, committed: CheckCircle2, passed: XCircle,
};
const INTEREST_COLORS: Record<string, string> = {
  sourced: "bg-muted/50 text-muted-foreground",
  screening: "bg-primary/10 text-primary",
  due_diligence: "bg-warning/10 text-warning",
  ic_review: "bg-chart-4/10 text-chart-4",
  committed: "bg-success/10 text-success",
  passed: "bg-destructive/10 text-destructive",
};

// ── Data hook ───────────────────────────────────────────────────────────
const useCommandCenterData = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["command-center", user?.id],
    queryFn: async () => {
      const [pipelineRes, activityRes, distressedRes] = await Promise.all([
        supabase
          .from("deal_pipeline")
          .select("id, stage, priority, updated_at, created_at, notes, companies(id, name, sector)")
          .eq("user_id", user!.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("activity_events")
          .select("id, action, entity_type, entity_name, published_at")
          .order("published_at", { ascending: false })
          .limit(10),
        supabase
          .from("distressed_assets")
          .select("id, name, asset_type, discount_pct, distress_type")
          .eq("status", "active")
          .order("listed_date", { ascending: false })
          .limit(3),
      ]);

      const deals = pipelineRes.data ?? [];
      const activeDeals = deals.filter((d) => d.stage !== "passed");

      // Deals needing attention: stale (>7 days no update) or high priority
      const needsAttention = activeDeals.filter((d) => {
        const daysSinceUpdate = differenceInDays(new Date(), new Date(d.updated_at));
        return daysSinceUpdate > 7 || d.priority === "high";
      });

      // In diligence / approaching commitment
      const inDiligence = deals.filter((d) => d.stage === "due_diligence" || d.stage === "ic_review");

      // Recently updated (last 3 days)
      const recentlyActive = activeDeals.filter((d) =>
        differenceInDays(new Date(), new Date(d.updated_at)) <= 3
      ).slice(0, 6);

      // Stage distribution
      const stageCounts: Record<string, number> = {};
      deals.forEach((d) => { stageCounts[d.stage] = (stageCounts[d.stage] ?? 0) + 1; });

      return {
        allDeals: deals,
        activeDeals,
        needsAttention,
        inDiligence,
        recentlyActive,
        stageCounts,
        totalCount: deals.length,
        activeCount: activeDeals.length,
        activity: activityRes.data ?? [],
        distressed: distressedRes.data ?? [],
      };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
};

// ── Deal Row ────────────────────────────────────────────────────────────
const DealRow = ({ deal, navigate }: { deal: any; navigate: (path: string) => void }) => {
  const Icon = INTEREST_ICONS[deal.stage] ?? Eye;
  const stale = differenceInDays(new Date(), new Date(deal.updated_at)) > 7;

  return (
    <button
      onClick={() => navigate(`/deals/${deal.id}`)}
      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {deal.companies?.name ?? "Unknown"}
          </p>
          {stale && (
            <span className="text-[9px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded shrink-0">
              Stale
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {deal.companies?.sector && (
            <span className="text-[10px] text-muted-foreground">{deal.companies.sector}</span>
          )}
          <span className="text-[10px] text-muted-foreground/40">·</span>
          <span className="text-[10px] text-muted-foreground/60">
            {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
          </span>
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

// ── Section ─────────────────────────────────────────────────────────────
const Section = ({ title, icon: Icon, count, action, actionLabel, children, accent }: {
  title: string; icon: typeof Target; count?: number; action?: () => void;
  actionLabel?: string; children: React.ReactNode; accent?: boolean;
}) => (
  <div className={`rounded-lg border bg-card overflow-hidden ${accent ? "border-warning/30" : "border-border"}`}>
    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent ? "text-warning" : "text-primary"}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {count !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{count}</span>
        )}
      </div>
      {action && actionLabel && (
        <button onClick={action} className="text-[10px] text-primary hover:underline font-medium flex items-center gap-0.5">
          {actionLabel} <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
    {children}
  </div>
);

// ── Pipeline Pulse Bar ──────────────────────────────────────────────────
const PipelinePulse = ({ stageCounts, total, navigate }: {
  stageCounts: Record<string, number>; total: number; navigate: (p: string) => void;
}) => {
  const stages = ["sourced", "screening", "due_diligence", "ic_review", "committed", "passed"];
  const colors: Record<string, string> = {
    sourced: "bg-muted-foreground/30", screening: "bg-primary/60",
    due_diligence: "bg-warning/60", ic_review: "bg-chart-4/60",
    committed: "bg-success/60", passed: "bg-destructive/40",
  };

  if (total === 0) return null;

  return (
    <button onClick={() => navigate("/deals/flow")} className="w-full group">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/20">
        {stages.map((s) => {
          const c = stageCounts[s] ?? 0;
          if (c === 0) return null;
          return (
            <div key={s} className={`${colors[s]} transition-all`}
              style={{ width: `${(c / total) * 100}%` }}
              title={`${INTEREST_LABELS[s]}: ${c}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        {stages.filter((s) => (stageCounts[s] ?? 0) > 0).map((s) => (
          <span key={s} className="text-[9px] text-muted-foreground flex items-center gap-1">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[s]}`} />
            {INTEREST_LABELS[s]} ({stageCounts[s]})
          </span>
        ))}
      </div>
    </button>
  );
};

// ── Main ────────────────────────────────────────────────────────────────
const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCommandCenterData();
  const { showUpgrade, blockedAction, dismissUpgrade } = useUsageTracking();
  const { data: onboardingCompleted } = useOnboardingStatus();

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_pipeline" }, () => {
        queryClient.invalidateQueries({ queryKey: ["command-center"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["command-center"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <div className="p-3 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight"
          >
            Grapevine
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-xs text-muted-foreground mt-0.5"
          >
            {data ? (
              <>{data.activeCount} active deals · {data.needsAttention.length > 0 ? `${data.needsAttention.length} need attention` : "All deals on track"}</>
            ) : (
              "Private markets OS"
            )}
          </motion.p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/deals/flow")}
            className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
          >
            <Handshake className="h-3.5 w-3.5" /> Deal Flow
          </button>
          <button
            onClick={() => navigate("/rooms")}
            className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
          >
            <Users className="h-3.5 w-3.5" /> Rooms
          </button>
        </div>
      </div>

      {/* Pipeline Pulse */}
      {data && data.totalCount > 0 && (
        <PipelinePulse stageCounts={data.stageCounts} total={data.totalCount} navigate={navigate} />
      )}

      <UpgradePrompt open={showUpgrade} onClose={dismissUpgrade} blockedAction={blockedAction} />
      <AnimatePresence>{!onboardingCompleted && <OnboardingFlow />}</AnimatePresence>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active Deals" value={data?.activeCount ?? 0} icon={<Handshake className="h-4 w-4" />} onClick={() => navigate("/deals")} />
        <StatCard label="In Diligence" value={data?.inDiligence?.length ?? 0} icon={<FileText className="h-4 w-4" />} accent="warning" />
        <StatCard label="Need Attention" value={data?.needsAttention?.length ?? 0} icon={<AlertTriangle className="h-4 w-4" />} accent={data?.needsAttention?.length ? "destructive" : undefined} />
        <StatCard label="Rooms" value={5} icon={<Users className="h-4 w-4" />} onClick={() => navigate("/rooms")} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Needs Attention */}
          {(data?.needsAttention?.length ?? 0) > 0 && (
            <Section title="Needs Attention" icon={AlertTriangle} count={data?.needsAttention?.length} accent>
              <div className="divide-y divide-border/50">
                {data!.needsAttention.slice(0, 5).map((deal: any) => (
                  <DealRow key={deal.id} deal={deal} navigate={navigate} />
                ))}
              </div>
            </Section>
          )}

          {/* Recently Active */}
          <Section
            title="Recently Active"
            icon={Activity}
            count={data?.recentlyActive?.length}
            action={() => navigate("/deals")}
            actionLabel="All Deals"
          >
            {isLoading ? (
              <div className="divide-y divide-border/50">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-4 py-3"><Skeleton className="h-4 w-40 mb-1" /><Skeleton className="h-3 w-24" /></div>
                ))}
              </div>
            ) : (data?.recentlyActive?.length ?? 0) > 0 ? (
              <div className="divide-y divide-border/50">
                {data!.recentlyActive.map((deal: any) => (
                  <DealRow key={deal.id} deal={deal} navigate={navigate} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Handshake}
                title="No active deals"
                description="Browse companies or run AI matcher to discover opportunities."
                actionLabel="Browse Companies"
                onAction={() => navigate("/companies")}
                secondaryLabel="AI Matcher"
                onSecondary={() => navigate("/deals/recommended")}
              />
            )}
          </Section>

          {/* In Diligence */}
          {(data?.inDiligence?.length ?? 0) > 0 && (
            <Section title="In Diligence" icon={FileText} count={data?.inDiligence?.length}>
              <div className="divide-y divide-border/50">
                {data!.inDiligence.slice(0, 4).map((deal: any) => (
                  <DealRow key={deal.id} deal={deal} navigate={navigate} />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right sidebar — 1/3 */}
        <div className="space-y-4">
          {/* Rooms */}
          <Section title="Your Rooms" icon={Users} action={() => navigate("/rooms")} actionLabel="All Rooms">
            <div className="p-3 space-y-1">
              {[
                { name: "Series B Syndicate", deals: 3, id: "room-1" },
                { name: "Distressed Credit Club", deals: 5, id: "room-2" },
                { name: "GP/LP Exchange", deals: 7, id: "room-4" },
              ].map((room) => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-md hover:bg-secondary/30 transition-colors group"
                >
                  <div className="h-7 w-7 rounded-md bg-grape/10 flex items-center justify-center shrink-0">
                    <Users className="h-3 w-3 text-grape" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {room.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{room.deals} active deals</p>
                  </div>
                </button>
              ))}
            </div>
          </Section>

          {/* AI Matches */}
          <Section
            title="AI Matches"
            icon={Sparkles}
            count={data?.distressed?.length}
            action={() => navigate("/deals/recommended")}
            actionLabel="View All"
          >
            {(data?.distressed?.length ?? 0) > 0 ? (
              <div className="divide-y divide-border/50">
                {data!.distressed.map((a: any) => (
                  <button
                    key={a.id}
                    onClick={() => navigate("/distressed")}
                    className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {a.asset_type} · {a.distress_type?.replace("_", " ")}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-medium text-warning shrink-0 ml-2">{a.discount_pct}%</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <Sparkles className="h-5 w-5 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Run AI matcher for thesis-based recommendations</p>
              </div>
            )}
          </Section>

          {/* Activity Feed */}
          <Section title="Activity" icon={Bell}>
            {(data?.activity?.length ?? 0) > 0 ? (
              <div className="divide-y divide-border/50">
                {data!.activity.slice(0, 6).map((event: any) => (
                  <div key={event.id} className="px-4 py-2.5">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">{event.entity_name}</span>{" "}
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
              <div className="p-6 text-center">
                <p className="text-xs text-muted-foreground">Deal activity will appear here</p>
              </div>
            )}
          </Section>

          {/* News */}
          <Suspense fallback={
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          }>
            <NewsFeed compact />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

// ── Stat Card ───────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, onClick }: {
  label: string; value: number; icon: React.ReactNode;
  accent?: "warning" | "success" | "destructive"; onClick?: () => void;
}) {
  const color = accent === "warning" ? "text-warning" : accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/20 transition-all disabled:cursor-default"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-semibold font-mono ${color}`}>{value}</div>
    </button>
  );
}

export default Index;
