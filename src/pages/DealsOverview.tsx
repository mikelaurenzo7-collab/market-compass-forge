import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Handshake, Sparkles, ArrowRight, Clock, TrendingUp, Briefcase, Plus, Compass, FileText, MessageSquare, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import CompanyAvatar from "@/components/CompanyAvatar";
import PageTransition from "@/components/PageTransition";

type PipelineDeal = {
  id: string;
  company_id: string;
  stage: string;
  priority: string | null;
  notes: string | null;
  updated_at: string;
  companies: { name: string; sector: string | null; stage: string | null } | null;
};

const STAGE_LABELS: Record<string, string> = {
  sourced: "Sourced",
  screening: "Screening",
  due_diligence: "Due Diligence",
  ic_review: "IC Review",
  committed: "Committed",
  passed: "Passed",
};

// Map pipeline stages to lifecycle verbs
const LIFECYCLE_VERBS = [
  { verb: "Discover", stages: ["sourced"], icon: Compass, color: "bg-primary/10 text-primary border-primary/20" },
  { verb: "Diligence", stages: ["screening", "due_diligence"], icon: FileText, color: "bg-warning/10 text-warning border-warning/20" },
  { verb: "Coordinate", stages: ["ic_review"], icon: MessageSquare, color: "bg-chart-4/10 text-chart-4 border-chart-4/20" },
  { verb: "Allocate", stages: ["committed"], icon: DollarSign, color: "bg-success/10 text-success border-success/20" },
];

const ACTIVE_STAGES = ["screening", "due_diligence", "ic_review"];

const DealsOverview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: deals, isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("*, companies(name, sector, stage)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PipelineDeal[];
    },
    enabled: !!user,
  });

  // Recent activity for the feed
  const { data: recentDecisions } = useQuery({
    queryKey: ["deals-recent-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_log")
        .select("*, deal_pipeline(id, companies(name))")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const activeDeals = useMemo(
    () => (deals ?? []).filter((d) => ACTIVE_STAGES.includes(d.stage)),
    [deals]
  );

  const newlySourced = useMemo(
    () => (deals ?? []).filter((d) => d.stage === "sourced").slice(0, 6),
    [deals]
  );

  const committed = useMemo(
    () => (deals ?? []).filter((d) => d.stage === "committed"),
    [deals]
  );

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (deals ?? []).forEach((d) => {
      counts[d.stage] = (counts[d.stage] ?? 0) + 1;
    });
    return counts;
  }, [deals]);

  // Lifecycle verb counts
  const lifecycleCounts = useMemo(() => {
    return LIFECYCLE_VERBS.map((v) => ({
      ...v,
      count: v.stages.reduce((sum, s) => sum + (stageCounts[s] ?? 0), 0),
    }));
  }, [stageCounts]);

  const totalActive = (deals ?? []).filter((d) => d.stage !== "passed").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Deals</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-mono text-primary">{deals?.length ?? 0}</span> deals in pipeline
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/deals/flow")}
              className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
            >
              <Handshake className="h-4 w-4" /> Pipeline View
            </button>
            <button
              onClick={() => navigate("/discover")}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Find Deals
            </button>
          </div>
        </div>

        {/* Lifecycle Progress — the capital deployment funnel */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Capital Lifecycle</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {lifecycleCounts.map((lc, i) => (
              <motion.div
                key={lc.verb}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border p-4 text-center ${lc.color} transition-all cursor-pointer hover:scale-[1.02]`}
                onClick={() => navigate("/deals/flow")}
              >
                <lc.icon className="h-5 w-5 mx-auto mb-1.5" />
                <p className="text-2xl font-black font-mono">{lc.count}</p>
                <p className="text-[11px] font-medium mt-0.5">{lc.verb}</p>
              </motion.div>
            ))}
          </div>
          {/* Progress bar */}
          {totalActive > 0 && (
            <div className="flex items-center gap-0.5 mt-3 h-2 rounded-full overflow-hidden bg-secondary">
              {lifecycleCounts.map((lc) => {
                const pct = totalActive > 0 ? (lc.count / totalActive) * 100 : 0;
                if (pct === 0) return null;
                return (
                  <motion.div
                    key={lc.verb}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full ${lc.verb === "Discover" ? "bg-primary" : lc.verb === "Diligence" ? "bg-warning" : lc.verb === "Coordinate" ? "bg-chart-4" : "bg-success"}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Active deals */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Active Deals
            </h2>
            <button onClick={() => navigate("/deals/flow")} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {activeDeals.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Briefcase className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No active deals in diligence</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                <button onClick={() => navigate("/discover")} className="text-primary hover:underline">Discover companies</button> and open a room to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeDeals.slice(0, 6).map((deal, i) => (
                <motion.button
                  key={deal.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/deals/${deal.id}`)}
                  className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <CompanyAvatar name={deal.companies?.name ?? "?"} sector={deal.companies?.sector} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {deal.companies?.name ?? "Unknown"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{deal.companies?.sector ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium">
                      {STAGE_LABELS[deal.stage] ?? deal.stage}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                  {deal.notes && (
                    <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{deal.notes}</p>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Newly sourced */}
            {newlySourced.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Plus className="h-4 w-4 text-muted-foreground" /> Newly Sourced
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {newlySourced.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                      className="rounded-lg border border-border bg-card p-3 text-left hover:border-primary/30 transition-colors flex items-center gap-3"
                    >
                      <CompanyAvatar name={deal.companies?.name ?? "?"} sector={deal.companies?.sector} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{deal.companies?.name ?? "Unknown"}</p>
                        <p className="text-[11px] text-muted-foreground">{deal.companies?.sector ?? "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Committed */}
            {committed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-success" /> Committed
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {committed.map((deal) => (
                    <button
                      key={deal.id}
                      onClick={() => navigate(`/deals/${deal.id}`)}
                      className="rounded-lg border border-success/20 bg-success/5 p-3 text-left hover:border-success/40 transition-colors flex items-center gap-3"
                    >
                      <CompanyAvatar name={deal.companies?.name ?? "?"} sector={deal.companies?.sector} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{deal.companies?.name ?? "Unknown"}</p>
                        <p className="text-[11px] text-muted-foreground">{deal.companies?.sector ?? "—"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Recent activity sidebar */}
          <div>
            <div className="rounded-lg border border-border bg-card">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" /> Recent Activity
                </h2>
              </div>
              {!recentDecisions?.length ? (
                <div className="p-6 text-center">
                  <Clock className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No recent deal activity</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentDecisions.map((d: any) => (
                    <button
                      key={d.id}
                      onClick={() => d.deal_pipeline?.id && navigate(`/deals/${d.deal_pipeline.id}`)}
                      className="w-full text-left px-4 py-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">{d.decision_type}</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {d.deal_pipeline?.companies?.name && (
                        <p className="text-[11px] text-primary mt-0.5">{d.deal_pipeline.companies.name}</p>
                      )}
                      {d.rationale && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{d.rationale}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default DealsOverview;
