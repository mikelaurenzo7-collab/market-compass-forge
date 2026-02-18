import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Handshake, Sparkles, ArrowRight, Clock, TrendingUp, Briefcase, Plus, Compass, FileText, MessageSquare, DollarSign, AlertTriangle, Zap, Timer, Eye, Radio, ChevronRight, Activity, Skull, BarChart3 } from "lucide-react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import CompanyAvatar from "@/components/CompanyAvatar";
import PageTransition from "@/components/PageTransition";
import { useWatchlists } from "@/components/WatchlistManager";
import { toast } from "sonner";
import "katex/dist/katex.min.css";
import katex from "katex";

type PipelineDeal = {
  id: string;
  company_id: string;
  stage: string;
  priority: string | null;
  notes: string | null;
  updated_at: string;
  created_at: string;
  companies: { name: string; sector: string | null; stage: string | null } | null;
};

import { STAGE_LABELS } from "@/components/deal-room/types";

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
  const queryClient = useQueryClient();

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

  const { data: recentDecisions } = useQuery({
    queryKey: ["deals-recent-decisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_log")
        .select("*, deal_pipeline(id, companies(name))")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Allocation totals
  const { data: allocationTotals } = useQuery({
    queryKey: ["deals-allocation-totals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_allocations")
        .select("amount");
      if (error) throw error;
      return (data ?? []).reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
    },
    enabled: !!user,
  });

  // Watchlist data
  const { data: watchlists } = useWatchlists();
  const watchedCompanyIds = useMemo(() => {
    const ids = new Set<string>();
    (watchlists ?? []).forEach((wl) => {
      ((wl.company_ids ?? []) as string[]).forEach((id) => ids.add(id));
    });
    return ids;
  }, [watchlists]);

  // Get company details for watched items
  const watchedIdsArray = useMemo(() => Array.from(watchedCompanyIds), [watchedCompanyIds]);
  const { data: watchedCompanies } = useQuery({
    queryKey: ["watched-companies", watchedIdsArray],
    queryFn: async () => {
      if (watchedIdsArray.length === 0) return [];
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, sector, description, stage")
        .in("id", watchedIdsArray);
      if (error) throw error;
      return data;
    },
    enabled: watchedIdsArray.length > 0,
  });

  // Signal strength: count recent alert_notifications per watched company
  const { data: signalCounts } = useQuery({
    queryKey: ["watched-signals", watchedIdsArray],
    queryFn: async () => {
      if (watchedIdsArray.length === 0) return {};
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("alert_notifications")
        .select("company_id")
        .in("company_id", watchedIdsArray)
        .gte("created_at", thirtyDaysAgo);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((n) => { if (n.company_id) counts[n.company_id] = (counts[n.company_id] ?? 0) + 1; });
      return counts;
    },
    enabled: watchedIdsArray.length > 0,
  });

  // Filter out watched companies already in pipeline
  const pipelineCompanyIds = useMemo(() => {
    return new Set((deals ?? []).map((d) => d.company_id));
  }, [deals]);

  const filteredWatched = useMemo(() => {
    return (watchedCompanies ?? []).filter((c) => !pipelineCompanyIds.has(c.id));
  }, [watchedCompanies, pipelineCompanyIds]);

  // Activate: move watched company to pipeline
  const activateWatched = useMutation({
    mutationFn: async (companyId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("deal_pipeline")
        .insert({ company_id: companyId, user_id: user.id, stage: "sourced" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (dealId) => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Deal room created from watchlist");
      navigate(`/deals/${dealId}`);
    },
    onError: () => toast.error("Failed to activate deal"),
  });

  const getSignalStrength = (companyId: string) => {
    const count = signalCounts?.[companyId] ?? 0;
    if (count >= 5) return { label: "Hot", color: "text-destructive", bg: "bg-destructive/10", bars: 3 };
    if (count >= 2) return { label: "Warm", color: "text-warning", bg: "bg-warning/10", bars: 2 };
    if (count >= 1) return { label: "Active", color: "text-primary", bg: "bg-primary/10", bars: 1 };
    return { label: "Quiet", color: "text-muted-foreground", bg: "bg-secondary", bars: 0 };
  };

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
    (deals ?? []).forEach((d) => { counts[d.stage] = (counts[d.stage] ?? 0) + 1; });
    return counts;
  }, [deals]);

  const lifecycleCounts = useMemo(() => {
    return LIFECYCLE_VERBS.map((v) => ({
      ...v,
      count: v.stages.reduce((sum, s) => sum + (stageCounts[s] ?? 0), 0),
    }));
  }, [stageCounts]);

  // Deal velocity metrics
  const velocityMetrics = useMemo(() => {
    if (!deals?.length) return null;
    const activeD = deals.filter(d => d.stage !== "passed");
    const avgAge = activeD.length > 0
      ? activeD.reduce((sum, d) => sum + differenceInDays(new Date(), new Date(d.created_at)), 0) / activeD.length
      : 0;
    const staleCount = activeD.filter(d => differenceInDays(new Date(), new Date(d.updated_at)) > 14).length;
    return { avgAge: Math.round(avgAge), staleCount, passedCount: stageCounts["passed"] ?? 0 };
  }, [deals, stageCounts]);

  // GP Dashboard: Pulse Metrics
  const pulseMetrics = useMemo(() => {
    if (!deals?.length) return null;
    const allDeals = deals ?? [];
    const totalAllocated = allocationTotals ?? 0;

    // Avg time to close: deals in "committed" stage
    const committedDeals = allDeals.filter(d => d.stage === "committed");
    const avgTimeToClose = committedDeals.length > 0
      ? Math.round(committedDeals.reduce((sum, d) => sum + differenceInDays(new Date(), new Date(d.created_at)), 0) / committedDeals.length)
      : 0;

    // Kill rate: % of deals that die in diligence stages
    const diligenceStages = ["screening", "due_diligence"];
    const passedFromDiligence = allDeals.filter(d => d.stage === "passed").length; // approximate
    const totalEverInDiligence = allDeals.filter(d => diligenceStages.includes(d.stage) || d.stage === "passed").length;
    const killRate = totalEverInDiligence > 0 ? Math.round((passedFromDiligence / Math.max(allDeals.length, 1)) * 100) : 0;

    // Yield Velocity = Sum(Allocated Capital) / Days in Diligence
    const diligenceDeals = allDeals.filter(d => diligenceStages.includes(d.stage));
    const avgDiligenceDays = diligenceDeals.length > 0
      ? diligenceDeals.reduce((sum, d) => sum + differenceInDays(new Date(), new Date(d.created_at)), 0) / diligenceDeals.length
      : 1;
    const yieldVelocity = avgDiligenceDays > 0 ? totalAllocated / avgDiligenceDays : 0;

    return { totalAllocated, avgTimeToClose, killRate, yieldVelocity, avgDiligenceDays: Math.round(avgDiligenceDays) };
  }, [deals, allocationTotals]);

  // Stage bottleneck data for horizontal bar chart
  const BOTTLENECK_STAGES = [
    { label: "Discover", stages: ["sourced"], color: "bg-primary" },
    { label: "Diligence", stages: ["screening", "due_diligence"], color: "bg-warning" },
    { label: "Coordinate", stages: ["ic_review"], color: "bg-chart-4" },
    { label: "Allocate", stages: ["committed"], color: "bg-success" },
    { label: "Report", stages: ["passed"], color: "bg-muted-foreground" },
  ];

  const bottleneckData = useMemo(() => {
    const maxCount = Math.max(1, ...BOTTLENECK_STAGES.map(s => s.stages.reduce((sum, st) => sum + (stageCounts[st] ?? 0), 0)));
    return BOTTLENECK_STAGES.map(s => ({
      ...s,
      count: s.stages.reduce((sum, st) => sum + (stageCounts[st] ?? 0), 0),
      pct: (s.stages.reduce((sum, st) => sum + (stageCounts[st] ?? 0), 0) / maxCount) * 100,
    }));
  }, [stageCounts]);

  // Render KaTeX formula
  const yieldVelocityHtml = useMemo(() => {
    try {
      return katex.renderToString(
        "\\text{Yield Velocity} = \\frac{\\sum \\text{Allocated Capital}}{\\text{Days in Diligence}}",
        { throwOnError: false, displayMode: false }
      );
    } catch { return ""; }
  }, []);

  const totalActive = (deals ?? []).filter((d) => d.stage !== "passed").length;

  const getDealAge = (deal: PipelineDeal) => {
    const days = differenceInDays(new Date(), new Date(deal.created_at));
    if (days > 30) return { label: `${days}d`, color: "text-destructive" };
    if (days > 14) return { label: `${days}d`, color: "text-warning" };
    return { label: `${days}d`, color: "text-muted-foreground" };
  };

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
              {allocationTotals != null && allocationTotals > 0 && (
                <span className="ml-2 text-success font-mono">· ${(allocationTotals / 1e6).toFixed(1)}M allocated</span>
              )}
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

        {/* ═══ Institutional Velocity (GP Dashboard) ═══ */}
        {pulseMetrics && (
          <section className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Institutional Velocity
              </h2>
              <span className="text-[9px] text-muted-foreground font-mono">PARTNER VIEW</span>
            </div>

            <div className="p-5 space-y-5">
              {/* Pulse Metrics Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                  className="rounded-lg border border-success/20 bg-success/5 p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Allocated</p>
                  <p className="text-xl font-black font-mono text-success">
                    ${pulseMetrics.totalAllocated >= 1e6 ? `${(pulseMetrics.totalAllocated / 1e6).toFixed(1)}M` : pulseMetrics.totalAllocated.toLocaleString()}
                  </p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg Time to Close</p>
                  <p className="text-xl font-black font-mono text-primary">{pulseMetrics.avgTimeToClose}d</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Skull className="h-3 w-3" /> Kill Rate
                  </p>
                  <p className="text-xl font-black font-mono text-destructive">{pulseMetrics.killRate}%</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="rounded-lg border border-chart-4/20 bg-chart-4/5 p-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Yield Velocity</p>
                  <p className="text-xl font-black font-mono text-chart-4">
                    ${pulseMetrics.yieldVelocity >= 1e6 ? `${(pulseMetrics.yieldVelocity / 1e6).toFixed(1)}M` : pulseMetrics.yieldVelocity >= 1e3 ? `${(pulseMetrics.yieldVelocity / 1e3).toFixed(0)}K` : pulseMetrics.yieldVelocity.toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/day</span>
                  </p>
                </motion.div>
              </div>

              {/* Stage Bottleneck Chart + Formula */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> Stage Bottleneck
                  </h3>
                  <div className="space-y-2">
                    {bottleneckData.map((stage, i) => (
                      <motion.div
                        key={stage.label}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xs text-muted-foreground w-20 text-right shrink-0">{stage.label}</span>
                        <div className="flex-1 h-6 bg-secondary rounded overflow-hidden relative">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(stage.pct, 2)}%` }}
                            transition={{ duration: 0.7, delay: i * 0.08 }}
                            className={`h-full ${stage.color} rounded flex items-center justify-end pr-2`}
                          >
                            {stage.count > 0 && (
                              <span className="text-[10px] font-bold text-white drop-shadow-sm">{stage.count}</span>
                            )}
                          </motion.div>
                        </div>
                        <span className="text-xs font-mono text-foreground w-6 text-right">{stage.count}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Yield Velocity Formula */}
                <div className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col justify-center items-center gap-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Formula</p>
                  <div
                    className="text-foreground"
                    dangerouslySetInnerHTML={{ __html: yieldVelocityHtml }}
                  />
                  <div className="text-center mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      ${pulseMetrics.totalAllocated.toLocaleString()} ÷ {pulseMetrics.avgDiligenceDays}d
                    </p>
                    <p className="text-sm font-black font-mono text-chart-4 mt-0.5">
                      = ${pulseMetrics.yieldVelocity >= 1e3 ? `${(pulseMetrics.yieldVelocity / 1e3).toFixed(1)}K` : pulseMetrics.yieldVelocity.toFixed(0)}/day
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Lifecycle Progress + Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 rounded-lg border border-border bg-card p-4">
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

          {/* Velocity widget */}
          {velocityMetrics && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" /> Velocity
              </h2>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Avg Deal Age</p>
                  <p className="text-lg font-black font-mono text-foreground">{velocityMetrics.avgAge}d</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Stale (&gt;14d)</p>
                  <p className={`text-lg font-black font-mono ${velocityMetrics.staleCount > 0 ? "text-warning" : "text-success"}`}>
                    {velocityMetrics.staleCount}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Passed</p>
                  <p className="text-lg font-black font-mono text-muted-foreground">{velocityMetrics.passedCount}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Shadow Pipeline — Watchlist */}
        {filteredWatched.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Eye className="h-4 w-4 text-warning" /> Watchlist
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">{filteredWatched.length}</span>
              </h2>
              <button onClick={() => navigate("/discover")} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                Add more <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWatched.map((company, i) => {
                const signal = getSignalStrength(company.id);
                return (
                  <motion.div
                    key={company.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-lg border border-warning/20 bg-card p-4 hover:border-warning/40 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <CompanyAvatar name={company.name} sector={company.sector} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{company.name}</p>
                        <p className="text-[11px] text-muted-foreground">{company.sector ?? "—"}</p>
                      </div>
                      {/* Signal Strength Indicator */}
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${signal.bg} ${signal.color}`}>
                        <div className="flex items-center gap-px">
                          {[1, 2, 3].map((bar) => (
                            <div
                              key={bar}
                              className={`w-[3px] rounded-sm transition-all ${bar <= signal.bars ? "bg-current" : "bg-current/20"}`}
                              style={{ height: `${6 + bar * 3}px` }}
                            />
                          ))}
                        </div>
                        <span>{signal.label}</span>
                      </div>
                    </div>
                    {company.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">{company.description}</p>
                    )}
                    <div className="flex items-center justify-end pt-2 border-t border-border/50">
                      <button
                        onClick={() => activateWatched.mutate(company.id)}
                        disabled={activateWatched.isPending}
                        className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Plus className="h-3 w-3" /> Activate
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

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
              {activeDeals.slice(0, 6).map((deal, i) => {
                const age = getDealAge(deal);
                return (
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
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono flex items-center gap-0.5 ${age.color}`}>
                          <Timer className="h-2.5 w-2.5" /> {age.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {deal.notes && (
                      <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{deal.notes}</p>
                    )}
                  </motion.button>
                );
              })}
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
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{deal.companies?.name ?? "Unknown"}</p>
                        <p className="text-[11px] text-muted-foreground">{deal.companies?.sector ?? "—"}</p>
                      </div>
                      <span className={`text-[10px] font-mono ${getDealAge(deal).color}`}>
                        {getDealAge(deal).label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Committed */}
            {committed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-success" /> Committed
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

            {/* Stale deals warning */}
            {velocityMetrics && velocityMetrics.staleCount > 0 && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-semibold text-foreground">{velocityMetrics.staleCount} Stale Deal{velocityMetrics.staleCount > 1 ? "s" : ""}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  These deals haven't been updated in over 14 days. Consider advancing them or moving to Passed.
                </p>
                <button onClick={() => navigate("/deals/flow")} className="text-xs text-warning hover:underline mt-2 inline-flex items-center gap-1">
                  Review in Pipeline <ArrowRight className="h-3 w-3" />
                </button>
              </div>
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
