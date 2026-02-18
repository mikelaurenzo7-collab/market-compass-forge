import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronRight, Link, Timer, CheckCircle, XCircle, LayoutDashboard, FileText, Scale, MessageSquare, Clock, PieChart, Bell, ShieldAlert, Users } from "lucide-react";
import { differenceInDays } from "date-fns";
import CompanyAvatar from "@/components/CompanyAvatar";
import PageTransition from "@/components/PageTransition";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

import { STAGE_LABELS, STAGE_COLORS } from "@/components/deal-room/types";
import type { TabId } from "@/components/deal-room/types";
import SummaryTab from "@/components/deal-room/SummaryTab";
import DiligenceTab from "@/components/deal-room/DiligenceTab";
import ValuationTab from "@/components/deal-room/ValuationTab";
import DiscussionTab from "@/components/deal-room/DiscussionTab";
import TimelineTab from "@/components/deal-room/TimelineTab";
import AllocationTab from "@/components/deal-room/AllocationTab";
import UpdatesTab from "@/components/deal-room/UpdatesTab";
import DealTeamSidebar from "@/components/deal-room/DealTeamSidebar";
import GrapevineScore from "@/components/deal-room/GrapevineScore";
import { useDealTeam } from "@/hooks/useDealTeam";

const TABS = [
  { id: "summary" as TabId, label: "Summary", icon: LayoutDashboard },
  { id: "diligence" as TabId, label: "Diligence", icon: FileText },
  { id: "valuation" as TabId, label: "Valuation", icon: Scale },
  { id: "discussion" as TabId, label: "Discussion", icon: MessageSquare },
  { id: "timeline" as TabId, label: "Timeline", icon: Clock },
  { id: "allocation" as TabId, label: "Allocation", icon: PieChart },
  { id: "updates" as TabId, label: "Updates", icon: Bell },
];

const DealRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const { canViewAllocation, effectiveRole } = useDealTeam(id);

  const { data: deal, isLoading } = useQuery({
    queryKey: ["deal-room", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("*, companies(id, name, sector, stage, description, hq_country, employee_count, founded_year, domain)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const companyId = (deal?.companies as any)?.id;

  const { data: decisions } = useQuery({
    queryKey: ["deal-decisions", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("decision_log").select("*").eq("deal_id", id!).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ["deal-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_comments").select("*").eq("deal_id", id!).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: profiles } = useQuery({
    queryKey: ["deal-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, display_name").limit(200);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { if (p.display_name) map[p.user_id] = p.display_name; });
      return map;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allocations } = useQuery({
    queryKey: ["deal-allocations", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_allocations").select("*").eq("deal_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: financials } = useQuery({
    queryKey: ["deal-financials", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("financials").select("*").eq("company_id", companyId!).order("period", { ascending: false }).limit(8);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: documents } = useQuery({
    queryKey: ["deal-documents", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_documents").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: fundingRounds } = useQuery({
    queryKey: ["deal-funding", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("funding_rounds").select("*").eq("company_id", companyId!).order("date", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: enrichments } = useQuery({
    queryKey: ["deal-enrichments", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_enrichments").select("*").eq("company_id", companyId!).order("scraped_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: votes } = useQuery({
    queryKey: ["deal-votes", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_votes").select("*").eq("pipeline_deal_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: dealTasks } = useQuery({
    queryKey: ["deal-tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_tasks").select("*").eq("deal_id", id!).order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!id,
  });

  // ── P3: Realtime subscriptions ──
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`deal-room-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_comments", filter: `deal_id=eq.${id}` }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["deal-comments", id] });
        if (payload.eventType === "INSERT" && (payload.new as any)?.user_id !== user?.id) {
          const name = profiles?.[(payload.new as any)?.user_id] ?? "A teammate";
          toast.info(`${name} commented on this deal`);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_votes", filter: `pipeline_deal_id=eq.${id}` }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["deal-votes", id] });
        if (payload.eventType === "INSERT" && (payload.new as any)?.user_id !== user?.id) {
          const name = profiles?.[(payload.new as any)?.user_id] ?? "A teammate";
          const vote = (payload.new as any)?.vote === "yes" ? "voted YES" : "voted NO";
          toast.info(`${name} ${vote} on this deal`);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "decision_log", filter: `deal_id=eq.${id}` }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["deal-decisions", id] });
        if (payload.eventType === "INSERT" && (payload.new as any)?.user_id !== user?.id) {
          const name = profiles?.[(payload.new as any)?.user_id] ?? "A teammate";
          toast.info(`${name} logged a decision on this deal`);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deal_allocations", filter: `deal_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["deal-allocations", id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient, user?.id, profiles]);

  const updateStage = useMutation({
    mutationFn: async (stage: string) => {
      if (!user) return;
      const oldStage = deal?.stage;

      // Blocker check: warn if critical tasks incomplete for current stage
      const currentStageTasks = (dealTasks ?? []).filter((t: any) => t.stage === oldStage);
      const criticalBlockers = currentStageTasks.filter((t: any) => t.is_critical && !t.is_completed);
      const ADVANCE_STAGES = ["sourced", "screening", "due_diligence", "ic_review", "committed"];
      const oldIdx = ADVANCE_STAGES.indexOf(oldStage ?? "");
      const newIdx = ADVANCE_STAGES.indexOf(stage);
      if (criticalBlockers.length > 0 && newIdx > oldIdx) {
        const confirmed = window.confirm(
          `⚠️ ${criticalBlockers.length} critical task${criticalBlockers.length > 1 ? "s" : ""} incomplete:\n\n${criticalBlockers.map((t: any) => `• ${t.title}`).join("\n")}\n\nAdvance anyway?`
        );
        if (!confirmed) return;
      }

      const { error } = await supabase.from("deal_pipeline").update({ stage }).eq("id", id!);
      if (error) throw error;
      await supabase.from("decision_log").insert({
        deal_id: id!, user_id: user.id, decision_type: "stage_change",
        from_state: oldStage, to_state: stage, rationale: `Moved from ${STAGE_LABELS[oldStage ?? ""] ?? oldStage} to ${STAGE_LABELS[stage]}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-room", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-decisions", id] });
      queryClient.invalidateQueries({ queryKey: ["deal-tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.success("Stage updated");
    },
  });

  const updateThesis = useMutation({
    mutationFn: async (thesis: string) => {
      const { error } = await supabase.from("deal_pipeline").update({ thesis } as any).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-room", id] });
      toast.success("Thesis saved");
    },
  });

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === "ArrowRight" && idx < TABS.length - 1) { setActiveTab(TABS[idx + 1].id); e.preventDefault(); }
    else if (e.key === "ArrowLeft" && idx > 0) { setActiveTab(TABS[idx - 1].id); e.preventDefault(); }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-muted-foreground">Deal not found</p>
        <button onClick={() => navigate("/deals")} className="mt-3 text-sm text-primary hover:underline">Back to Deals</button>
      </div>
    );
  }

  const company = deal.companies as any;
  const totalAllocated = (allocations ?? []).reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
  const dealAge = differenceInDays(new Date(), new Date(deal.created_at));
  const yesVotes = (votes ?? []).filter((v: any) => v.vote === "yes").length;
  const noVotes = (votes ?? []).filter((v: any) => v.vote === "no").length;

  // Compliance progress for current stage
  const currentStageTasks = (dealTasks ?? []).filter((t: any) => t.stage === deal.stage);
  const completedStageTasks = currentStageTasks.filter((t: any) => t.is_completed).length;
  const compliancePct = currentStageTasks.length > 0 ? Math.round((completedStageTasks / currentStageTasks.length) * 100) : 0;
  const criticalBlockers = currentStageTasks.filter((t: any) => t.is_critical && !t.is_completed);

  return (
    <PageTransition>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={`px-4 sm:px-6 pt-4 pb-3 border-b-2 ${STAGE_COLORS[deal.stage] ?? "border-border/40"} bg-card/50`}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <button onClick={() => navigate("/deals")} className="hover:text-foreground transition-colors">Deals</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">{company?.name ?? "Deal Room"}</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CompanyAvatar name={company?.name ?? "?"} sector={company?.sector} />
              <div>
                <h1 className="text-lg font-semibold text-foreground">{company?.name ?? "Unknown"}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {company?.sector && <span className="text-xs text-muted-foreground">{company.sector}</span>}
                  {company?.hq_country && <span className="text-xs text-muted-foreground">· {company.hq_country}</span>}
                  {company?.domain && (
                    <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                      <Link className="h-2.5 w-2.5" /> {company.domain}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <GrapevineScore
              dealTasks={dealTasks ?? []}
              votes={votes ?? []}
              documents={documents ?? []}
              latestFinancial={financials?.[0] ?? null}
              latestFunding={fundingRounds?.[0] ?? null}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" /> {dealAge}d in pipeline
              </span>
              {totalAllocated > 0 && (
                <span className="text-xs font-mono text-success bg-success/10 border border-success/20 px-2 py-1 rounded-md">
                  ${totalAllocated.toLocaleString()} allocated
                </span>
              )}
              {(yesVotes > 0 || noVotes > 0) && (
                <span className="text-[10px] font-mono flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-secondary/50">
                  <CheckCircle className="h-3 w-3 text-success" /> {yesVotes}
                  <XCircle className="h-3 w-3 text-destructive" /> {noVotes}
                </span>
              )}
              <select
                value={deal.stage}
                onChange={(e) => updateStage.mutate(e.target.value)}
                disabled={updateStage.isPending}
                className="h-8 px-3 rounded-md border border-border bg-background text-xs text-foreground disabled:opacity-50"
              >
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Compliance Progress Bar */}
          {currentStageTasks.length > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Compliance</span>
                <Progress value={compliancePct} className="h-1.5 flex-1" />
                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{completedStageTasks}/{currentStageTasks.length}</span>
              </div>
              {criticalBlockers.length > 0 && (
                <span className="text-[10px] text-destructive flex items-center gap-1 font-medium">
                  <ShieldAlert className="h-3 w-3" /> {criticalBlockers.length} blocker{criticalBlockers.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Tabs */}
          <div role="tablist" aria-label="Deal room tabs" className="flex items-center gap-1 mt-4 -mb-px overflow-x-auto" onKeyDown={handleKeyDown}>
            {TABS.filter((tab) => tab.id !== "allocation" || canViewAllocation).map((tab) => {
              const isActive = activeTab === tab.id;
              let badge: number | null = null;
              if (tab.id === "discussion") badge = comments?.length ?? 0;
              if (tab.id === "diligence") badge = documents?.length ?? 0;
              if (tab.id === "allocation") badge = allocations?.length ?? 0;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-t-sm ${
                    isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {badge != null && badge > 0 && (
                    <span className="text-[9px] font-mono bg-secondary text-muted-foreground rounded-full px-1 min-w-[16px] text-center">{badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab panels */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex gap-6">
            <div role="tabpanel" id={`panel-${activeTab}`} className="flex-1 p-4 sm:p-6 min-w-0">
              {activeTab === "summary" && (
                <SummaryTab company={company} deal={deal} decisions={decisions ?? null} comments={comments ?? null} financials={financials ?? null} fundingRounds={fundingRounds ?? null} documents={documents ?? null} allocations={allocations ?? null} enrichments={enrichments ?? null} votes={votes ?? null} onSaveThesis={(t: string) => updateThesis.mutate(t)} companyId={companyId} dealId={id} dealMode={(deal as any).deal_mode ?? "enterprise"} onToggleDealMode={(mode: string) => { supabase.from("deal_pipeline").update({ deal_mode: mode } as any).eq("id", id!).then(() => queryClient.invalidateQueries({ queryKey: ["deal-room", id] })); }} />
              )}
              {activeTab === "diligence" && <DiligenceTab documents={documents ?? []} financials={financials ?? []} enrichments={enrichments ?? []} companyName={company?.name} companyId={companyId} dealId={id} dealMode={(deal as any).deal_mode ?? "enterprise"} />}
              {activeTab === "valuation" && <ValuationTab financials={financials ?? []} fundingRounds={fundingRounds ?? []} companyName={company?.name} companyId={companyId} dealId={id} dealMode={(deal as any).deal_mode ?? "enterprise"} />}
              {activeTab === "discussion" && <DiscussionTab comments={comments ?? []} dealId={id!} votes={votes ?? []} profiles={profiles ?? {}} thesis={(deal as any).thesis ?? ""} financials={financials?.[0]} companyName={company?.name} sector={company?.sector} stage={company?.stage} />}
              {activeTab === "timeline" && <TimelineTab decisions={decisions ?? []} />}
              {activeTab === "allocation" && canViewAllocation && <AllocationTab allocations={allocations ?? []} dealId={id!} />}
              {activeTab === "updates" && <UpdatesTab decisions={decisions ?? []} dealId={id!} />}
            </div>
            {/* Team Sidebar */}
            <div className="hidden lg:block w-64 shrink-0 pr-6 pt-6">
              <div className="sticky top-6 space-y-4">
                <DealTeamSidebar dealId={id!} profiles={profiles ?? {}} />
                <div className="rounded-lg border border-border bg-card px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">
                    Your role: <span className="font-semibold text-foreground capitalize">{effectiveRole}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default DealRoom;
