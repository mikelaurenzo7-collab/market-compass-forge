import { useState, useMemo, useEffect } from "react";
import PipelineAnalytics from "@/components/PipelineAnalytics";
import PageTransition from "@/components/PageTransition";
import DealTransactionsTable from "@/components/DealTransactionsTable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/hooks/useData";
import { GripVertical, Trash2, Download, BarChart3, LayoutGrid, Table as TableIcon, MessageSquare } from "lucide-react";
import CompanyAvatar from "@/components/CompanyAvatar";
import { exportPipelineCSV } from "@/lib/export";
import { logActivity } from "@/lib/activityLogger";
import { useNavigate } from "react-router-dom";
import PipelineTasks from "@/components/PipelineTasks";
import CompanyHoverCard from "@/components/CompanyHoverCard";
import { KanbanSkeleton } from "@/components/SkeletonLoaders";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileDealCard from "@/components/MobileCompanyCard";
import DealWorkspace from "@/components/DealWorkspace";
import { useSlackNotify } from "@/hooks/useSlackNotify";

import { STAGES, STAGE_LABELS, STAGE_BORDER_TOP_COLORS } from "@/components/deal-room/types";
const STAGE_COLORS = STAGE_BORDER_TOP_COLORS;

type PipelineDeal = {
  id: string; company_id: string; stage: string; priority: string | null;
  notes: string | null; companies: { name: string; sector: string | null; stage: string | null } | null;
};

const Deals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { notify: slackNotify } = useSlackNotify();
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [workspaceDeal, setWorkspaceDeal] = useState<{ id: string; companyId: string; companyName: string } | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('deals-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deal_pipeline' }, () => {
        queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: deals, isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_pipeline").select("*, companies(name, sector, stage)").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as PipelineDeal[];
    },
    enabled: !!user,
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const deal = deals?.find((d) => d.id === id);
      const previousStage = deal?.stage;
      const { error } = await supabase.from("deal_pipeline").update({ stage }).eq("id", id);
      if (error) throw error;
      if (user && deal) {
        logActivity({ userId: user.id, action: `moved to ${STAGE_LABELS[stage]}`, entityType: "deal", entityId: deal.company_id, entityName: deal.companies?.name ?? "Unknown" });
        slackNotify("deal_stage_change", {
          company_name: deal.companies?.name ?? "Unknown",
          new_stage: STAGE_LABELS[stage],
          previous_stage: previousStage ? STAGE_LABELS[previousStage] : undefined,
          sector: deal.companies?.sector,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const removeDeal = useMutation({
    mutationFn: async (id: string) => {
      const deal = deals?.find((d) => d.id === id);
      const { error } = await supabase.from("deal_pipeline").delete().eq("id", id);
      if (error) throw error;
      if (user && deal) logActivity({ userId: user.id, action: "removed from pipeline", entityType: "deal", entityId: deal.company_id, entityName: deal.companies?.name ?? "Unknown" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pipeline"] }),
  });

  const dealsByStage = useMemo(() => {
    const grouped: Record<string, PipelineDeal[]> = {};
    STAGES.forEach((s) => (grouped[s] = []));
    (deals ?? []).forEach((d) => { if (grouped[d.stage]) grouped[d.stage].push(d); else grouped["sourced"].push(d); });
    return grouped;
  }, [deals]);

  const handleDrop = (stage: string) => { if (dragItem) { updateStage.mutate({ id: dragItem, stage }); setDragItem(null); } };

  return (
    <PageTransition>
    <div className="p-3 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Deal Flow</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {view === "kanban" ? (
              <><span className="font-mono text-primary">{deals?.length ?? 0}</span> deals in pipeline · Drag to move between stages</>
            ) : (
              <>Market transaction log · Filterable by type, industry, and size</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border border-border rounded-md overflow-hidden">
            <button onClick={() => setView("kanban")} className={`h-8 px-3 text-xs flex items-center gap-1.5 transition-colors ${view === "kanban" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> Pipeline
            </button>
            <button onClick={() => setView("table")} className={`h-8 px-3 text-xs flex items-center gap-1.5 transition-colors ${view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <TableIcon className="h-3.5 w-3.5" /> Transactions
            </button>
          </div>
          {view === "kanban" && (
            <>
              <button onClick={() => setShowAnalytics(!showAnalytics)} className={`h-8 px-3 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${showAnalytics ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                <BarChart3 className="h-3.5 w-3.5" /> Analytics
              </button>
              <button onClick={() => deals && exportPipelineCSV(deals)} disabled={!deals?.length} className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 disabled:opacity-50">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </>
          )}
        </div>
      </div>

      {view === "table" ? (
        <DealTransactionsTable />
      ) : (
        <>
          {showAnalytics && <PipelineAnalytics />}
          {isLoading ? <KanbanSkeleton /> : (
            isMobile ? (
              <div className="space-y-2 pb-4">
                {Object.entries(dealsByStage).map(([stage, stageDealsList]) =>
                  stageDealsList && stageDealsList.length > 0 ? (
                    <div key={stage} className="space-y-2">
                      <div className="px-4 py-2 bg-secondary rounded-lg">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          {STAGE_LABELS[stage]} ({stageDealsList.length})
                        </h3>
                      </div>
                      <div className="space-y-2 px-4">
                        {stageDealsList.map((deal) => (
                          <MobileDealCard
                            key={deal.id}
                            deal={deal}
                            onStageChange={(id, newStage) => updateStage.mutate({ id, stage: newStage })}
                            onDelete={(id) => removeDeal.mutate(id)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {STAGES.map((stage) => (
                  <div key={stage} className={`min-w-[280px] w-[280px] shrink-0 rounded-lg border border-border bg-card border-t-2 ${STAGE_COLORS[stage]}`} onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(stage)}>
                    <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{STAGE_LABELS[stage]}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{dealsByStage[stage]?.length ?? 0}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[200px]">
                      {dealsByStage[stage]?.map((deal) => (
                        <div key={deal.id} draggable onDragStart={() => setDragItem(deal.id)} className="rounded-md border border-border bg-background p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all group hover:shadow-md">
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <CompanyAvatar name={deal.companies?.name ?? "?"} sector={deal.companies?.sector} />
                                <CompanyHoverCard company={{ id: deal.company_id, name: deal.companies?.name ?? "Unknown", sector: deal.companies?.sector, stage: deal.companies?.stage }}>
                                  <button onClick={(e) => { e.stopPropagation(); navigate(`/deals/${deal.id}`); }} className="text-sm font-medium text-foreground truncate hover:text-primary transition-colors text-left">
                                    {deal.companies?.name ?? "Unknown"}
                                  </button>
                                </CompanyHoverCard>
                              </div>
                              {deal.companies?.sector && <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">{deal.companies.sector}</p>}
                              {deal.notes && <p className="text-[11px] text-muted-foreground mt-1 ml-5 line-clamp-2">{deal.notes}</p>}
                              <PipelineTasks dealId={deal.id} />
                            </div>
                            <button onClick={() => removeDeal.mutate(deal.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setWorkspaceDeal({ id: deal.id, companyId: deal.company_id, companyName: deal.companies?.name ?? "Unknown" }); }}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                              title="Open deal workspace"
                            >
                              <MessageSquare className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Deal Workspace Modal */}
      {workspaceDeal && (
        <DealWorkspace
          dealId={workspaceDeal.id}
          companyId={workspaceDeal.companyId}
          companyName={workspaceDeal.companyName}
          onClose={() => setWorkspaceDeal(null)}
        />
      )}
    </div>
    </PageTransition>
  );
};

export default Deals;
