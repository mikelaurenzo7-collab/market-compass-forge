import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, FileText, MessageSquare, Clock, PieChart, Bell, LayoutDashboard, ChevronRight, Scale, BookOpen, Plus, Trash2, DollarSign, Upload, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import CompanyAvatar from "@/components/CompanyAvatar";
import PageTransition from "@/components/PageTransition";
import { toast } from "sonner";

const STAGE_LABELS: Record<string, string> = {
  sourced: "Sourced", screening: "Screening", due_diligence: "Due Diligence",
  ic_review: "IC Review", committed: "Committed", passed: "Passed",
};

const TABS = [
  { id: "summary", label: "Summary", icon: LayoutDashboard },
  { id: "diligence", label: "Diligence", icon: FileText },
  { id: "valuation", label: "Valuation", icon: Scale },
  { id: "discussion", label: "Discussion", icon: MessageSquare },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "allocation", label: "Allocation", icon: PieChart },
  { id: "updates", label: "Updates", icon: Bell },
] as const;

type TabId = (typeof TABS)[number]["id"];

const DealRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("summary");

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
      const { data, error } = await supabase
        .from("decision_log")
        .select("*")
        .eq("deal_id", id!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id && ["timeline", "summary", "updates"].includes(activeTab),
  });

  const { data: comments } = useQuery({
    queryKey: ["deal-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_comments")
        .select("*")
        .eq("deal_id", id!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!id && ["discussion", "summary"].includes(activeTab),
  });

  const { data: allocations } = useQuery({
    queryKey: ["deal-allocations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_allocations")
        .select("*")
        .eq("deal_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && ["allocation", "summary"].includes(activeTab),
  });

  // Financials for this company
  const { data: financials } = useQuery({
    queryKey: ["deal-financials", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financials")
        .select("*")
        .eq("company_id", companyId!)
        .order("period", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && ["summary", "diligence", "valuation"].includes(activeTab),
  });

  // Documents for this company
  const { data: documents } = useQuery({
    queryKey: ["deal-documents", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && ["diligence", "summary"].includes(activeTab),
  });

  // Funding rounds
  const { data: fundingRounds } = useQuery({
    queryKey: ["deal-funding", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funding_rounds")
        .select("*")
        .eq("company_id", companyId!)
        .order("date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && ["summary", "valuation"].includes(activeTab),
  });

  const updateStage = useMutation({
    mutationFn: async (stage: string) => {
      const { error } = await supabase.from("deal_pipeline").update({ stage }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-room", id] });
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

  return (
    <PageTransition>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-border/40 bg-card/50">
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
                    <a href={`https://${company.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                      {company.domain}
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {totalAllocated > 0 && (
                <span className="text-xs font-mono text-success bg-success/10 border border-success/20 px-2 py-1 rounded-md">
                  ${totalAllocated.toLocaleString()} allocated
                </span>
              )}
              <select
                value={deal.stage}
                onChange={(e) => updateStage.mutate(e.target.value)}
                className="h-8 px-3 rounded-md border border-border bg-background text-xs text-foreground"
              >
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div role="tablist" aria-label="Deal room tabs" className="flex items-center gap-1 mt-4 -mb-px overflow-x-auto" onKeyDown={handleKeyDown}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
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
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab panels */}
        <div className="flex-1 overflow-y-auto">
          <div role="tabpanel" id={`panel-${activeTab}`} className="p-4 sm:p-6">
            {activeTab === "summary" && (
              <SummaryTab company={company} deal={deal} decisions={decisions} comments={comments} financials={financials} fundingRounds={fundingRounds} documents={documents} allocations={allocations} onSaveThesis={(t: string) => updateThesis.mutate(t)} />
            )}
            {activeTab === "diligence" && <DiligenceTab documents={documents ?? []} financials={financials ?? []} companyName={company?.name} />}
            {activeTab === "valuation" && <ValuationTab navigate={navigate} financials={financials ?? []} fundingRounds={fundingRounds ?? []} />}
            {activeTab === "discussion" && <DiscussionTab comments={comments ?? []} dealId={id!} />}
            {activeTab === "timeline" && <TimelineTab decisions={decisions ?? []} />}
            {activeTab === "allocation" && <AllocationTab allocations={allocations ?? []} dealId={id!} />}
            {activeTab === "updates" && <UpdatesTab decisions={decisions ?? []} />}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

/* ── Summary Tab ── */
const SummaryTab = ({ company, deal, decisions, comments, financials, fundingRounds, documents, allocations, onSaveThesis }: any) => {
  const [editingThesis, setEditingThesis] = useState(false);
  const [thesis, setThesis] = useState((deal as any).thesis ?? "");
  const latestFinancial = financials?.[0];
  const totalAllocated = (allocations ?? []).reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      <div className="lg:col-span-2 space-y-5">
        {/* Thesis */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Investment Thesis</h3>
            <button onClick={() => { if (editingThesis) onSaveThesis(thesis); setEditingThesis(!editingThesis); }} className="text-[10px] text-primary hover:underline">
              {editingThesis ? "Save" : "Edit"}
            </button>
          </div>
          {editingThesis ? (
            <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} rows={4}
              className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              placeholder="Why are we looking at this deal? What's the core thesis?" />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {thesis || "No thesis documented yet. Click Edit to add your investment rationale."}
            </p>
          )}
        </div>

        {/* Key Financials */}
        {latestFinancial && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Key Financials
              <span className="text-[10px] text-muted-foreground font-normal ml-auto">{latestFinancial.period}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {latestFinancial.revenue != null && (
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Revenue</p>
                  <p className="text-sm font-mono font-medium text-foreground mt-0.5">${(latestFinancial.revenue / 1e6).toFixed(1)}M</p>
                </div>
              )}
              {latestFinancial.ebitda != null && (
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">EBITDA</p>
                  <p className="text-sm font-mono font-medium text-foreground mt-0.5">${(latestFinancial.ebitda / 1e6).toFixed(1)}M</p>
                </div>
              )}
              {latestFinancial.gross_margin != null && (
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Gross Margin</p>
                  <p className="text-sm font-mono font-medium text-foreground mt-0.5">{(latestFinancial.gross_margin * 100).toFixed(1)}%</p>
                </div>
              )}
              {latestFinancial.arr != null && (
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">ARR</p>
                  <p className="text-sm font-mono font-medium text-foreground mt-0.5">${(latestFinancial.arr / 1e6).toFixed(1)}M</p>
                </div>
              )}
              {latestFinancial.burn_rate != null && (
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Burn Rate</p>
                  <p className="text-sm font-mono font-medium text-destructive mt-0.5">${(Math.abs(latestFinancial.burn_rate) / 1e6).toFixed(1)}M/mo</p>
                </div>
              )}
              {latestFinancial.runway_months != null && (
                <div>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Runway</p>
                  <p className="text-sm font-mono font-medium text-foreground mt-0.5">{latestFinancial.runway_months} months</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company overview */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Overview</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{company?.description ?? "No company description available."}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {company?.sector && <MetricItem label="Sector" value={company.sector} />}
            {company?.stage && <MetricItem label="Stage" value={company.stage} />}
            {company?.employee_count && <MetricItem label="Employees" value={company.employee_count.toLocaleString()} />}
            {company?.founded_year && <MetricItem label="Founded" value={String(company.founded_year)} />}
          </div>
        </div>

        {/* Funding history */}
        {fundingRounds && fundingRounds.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Funding History
            </h3>
            <div className="space-y-2">
              {fundingRounds.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-2 last:border-0">
                  <div>
                    <span className="font-medium text-foreground">{r.round_type}</span>
                    {r.date && <span className="text-muted-foreground ml-2">{format(new Date(r.date), "MMM yyyy")}</span>}
                  </div>
                  <div className="text-right">
                    {r.amount && <span className="font-mono text-foreground">${(r.amount / 1e6).toFixed(1)}M</span>}
                    {r.valuation_post && <span className="text-muted-foreground ml-2">@ ${(r.valuation_post / 1e6).toFixed(0)}M</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {deal.notes && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Deal Notes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{deal.notes}</p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Deal Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Stage</span><span className="text-primary font-medium">{STAGE_LABELS[deal.stage] ?? deal.stage}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Priority</span><span className="text-foreground">{deal.priority ?? "—"}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Updated</span><span className="text-foreground">{formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}</span></div>
            {totalAllocated > 0 && (
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Allocated</span><span className="text-success font-mono font-medium">${totalAllocated.toLocaleString()}</span></div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Quick Stats</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Decisions</span><span className="font-mono text-foreground">{decisions?.length ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Comments</span><span className="font-mono text-foreground">{comments?.length ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Documents</span><span className="font-mono text-foreground">{documents?.length ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Allocations</span><span className="font-mono text-foreground">{allocations?.length ?? 0}</span></div>
          </div>
        </div>

        {/* Recent activity */}
        {decisions && decisions.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {decisions.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-start gap-2 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-foreground font-medium">{d.decision_type}</span>
                    {d.rationale && <span className="text-muted-foreground"> — {d.rationale}</span>}
                    <p className="text-muted-foreground/60 mt-0.5">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
    <p className="text-sm text-foreground mt-0.5">{value}</p>
  </div>
);

/* ── Diligence Tab ── */
const DiligenceTab = ({ documents, financials, companyName }: { documents: any[]; financials: any[]; companyName?: string }) => (
  <div className="max-w-4xl space-y-6">
    {/* Documents section */}
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Documents ({documents.length})
        </h3>
        <button className="h-7 px-3 rounded-md border border-border text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
          <Upload className="h-3 w-3" /> Upload
        </button>
      </div>
      {documents.length === 0 ? (
        <div className="p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Upload CIMs, financials, rent rolls, and other diligence materials</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {documents.map((doc: any) => (
            <div key={doc.id} className="px-4 py-3 hover:bg-secondary/30 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground capitalize">{doc.document_type}</span>
                    <span className="text-[10px] text-muted-foreground">v{doc.version}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
              {doc.ai_summary && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">AI Summary</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Financials history */}
    {financials.length > 0 && (
      <div className="rounded-lg border border-border bg-card">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Financial History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Period</th>
                <th className="text-right px-4 py-2 font-medium">Revenue</th>
                <th className="text-right px-4 py-2 font-medium">EBITDA</th>
                <th className="text-right px-4 py-2 font-medium">Gross Margin</th>
                <th className="text-right px-4 py-2 font-medium">ARR</th>
              </tr>
            </thead>
            <tbody>
              {financials.map((f: any) => (
                <tr key={f.id} className="border-b border-border/50">
                  <td className="px-4 py-2 font-medium text-foreground">{f.period}</td>
                  <td className="text-right px-4 py-2 font-mono text-foreground">{f.revenue ? `$${(f.revenue / 1e6).toFixed(1)}M` : "—"}</td>
                  <td className="text-right px-4 py-2 font-mono text-foreground">{f.ebitda ? `$${(f.ebitda / 1e6).toFixed(1)}M` : "—"}</td>
                  <td className="text-right px-4 py-2 font-mono text-foreground">{f.gross_margin ? `${(f.gross_margin * 100).toFixed(1)}%` : "—"}</td>
                  <td className="text-right px-4 py-2 font-mono text-foreground">{f.arr ? `$${(f.arr / 1e6).toFixed(1)}M` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Risk flags placeholder */}
    <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-warning" /> Risk Assessment
      </h3>
      <p className="text-xs text-muted-foreground">AI risk analysis will populate automatically as documents are uploaded and analyzed.</p>
    </div>
  </div>
);

/* ── Valuation Tab ── */
const ValuationTab = ({ navigate, financials, fundingRounds }: { navigate: any; financials: any[]; fundingRounds: any[] }) => (
  <div className="max-w-4xl space-y-6">
    {/* Latest valuation data */}
    {fundingRounds.length > 0 && (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Valuation History</h3>
        <div className="space-y-2">
          {fundingRounds.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between text-xs border-b border-border/30 pb-2 last:border-0">
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{r.round_type}</span>
                {r.date && <span className="text-muted-foreground">{format(new Date(r.date), "MMM yyyy")}</span>}
              </div>
              <div className="flex items-center gap-4">
                {r.amount && <span className="font-mono text-foreground">${(r.amount / 1e6).toFixed(1)}M raised</span>}
                {r.valuation_pre && <span className="text-muted-foreground">Pre: ${(r.valuation_pre / 1e6).toFixed(0)}M</span>}
                {r.valuation_post && <span className="text-primary font-mono font-medium">Post: ${(r.valuation_post / 1e6).toFixed(0)}M</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Key multiples */}
    {financials.length > 0 && fundingRounds.length > 0 && (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Implied Multiples</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(() => {
            const latestVal = fundingRounds[0]?.valuation_post;
            const latestRev = financials[0]?.revenue;
            const latestEbitda = financials[0]?.ebitda;
            const latestArr = financials[0]?.arr;
            return (
              <>
                {latestVal && latestRev && <MetricItem label="EV/Revenue" value={`${(latestVal / latestRev).toFixed(1)}x`} />}
                {latestVal && latestEbitda && latestEbitda > 0 && <MetricItem label="EV/EBITDA" value={`${(latestVal / latestEbitda).toFixed(1)}x`} />}
                {latestVal && latestArr && <MetricItem label="EV/ARR" value={`${(latestVal / latestArr).toFixed(1)}x`} />}
                {latestVal && <MetricItem label="Last Valuation" value={`$${(latestVal / 1e6).toFixed(0)}M`} />}
              </>
            );
          })()}
        </div>
      </div>
    )}

    <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
      <Scale className="h-10 w-10 text-primary/40 mx-auto" />
      <h3 className="text-sm font-semibold text-foreground">Advanced Valuation Toolkit</h3>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
        DCF models, comparable analysis, and football field visualizations.
      </p>
      <button onClick={() => navigate("/valuations")} className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
        Open Valuation Tools
      </button>
    </div>
  </div>
);

/* ── Discussion Tab ── */
const DiscussionTab = ({ comments, dealId }: { comments: any[]; dealId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const addComment = useMutation({
    mutationFn: async () => {
      if (!newComment.trim() || !user) return;
      const { error } = await supabase.from("deal_comments").insert({ deal_id: dealId, user_id: user.id, content: newComment.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] });
    },
  });

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex gap-2">
        <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addComment.mutate()}
          placeholder="Add a comment..."
          className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
        <button onClick={() => addComment.mutate()} disabled={!newComment.trim()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">Post</button>
      </div>
      {comments.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start the IC conversation about this deal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c: any) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted-foreground">{c.user_id.slice(0, 8)}</span>
                <span className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
              </div>
              <p className="text-sm text-foreground">{c.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Timeline Tab ── */
const TimelineTab = ({ decisions }: { decisions: any[] }) => {
  if (decisions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center max-w-lg mx-auto">
        <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No timeline events yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Stage changes, votes, and notes will appear here</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-1">
      {decisions.map((d: any, i: number) => (
        <div key={d.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full border-2 border-border bg-card flex items-center justify-center shrink-0">
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>
            {i < decisions.length - 1 && <div className="w-px flex-1 bg-border/50" />}
          </div>
          <div className="pb-4 flex-1">
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{d.decision_type}</span>
                {d.from_state && d.to_state && <span className="text-[10px] text-muted-foreground">{d.from_state} → {d.to_state}</span>}
              </div>
              {d.rationale && <p className="text-xs text-muted-foreground mt-1">{d.rationale}</p>}
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">{format(new Date(d.created_at), "MMM d, yyyy h:mm a")}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Allocation Tab ── */
const AllocationTab = ({ allocations, dealId }: { allocations: any[]; dealId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ allocation_type: "equity", amount: "", source_name: "", ownership_pct: "", commitment_date: "", notes: "" });

  const addAllocation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("deal_allocations").insert({
        deal_id: dealId, user_id: user.id, allocation_type: form.allocation_type,
        amount: form.amount ? parseFloat(form.amount) : null, source_name: form.source_name || null,
        ownership_pct: form.ownership_pct ? parseFloat(form.ownership_pct) : null,
        commitment_date: form.commitment_date || null, notes: form.notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-allocations", dealId] });
      setForm({ allocation_type: "equity", amount: "", source_name: "", ownership_pct: "", commitment_date: "", notes: "" });
      setShowForm(false);
      toast.success("Allocation added");
    },
  });

  const deleteAllocation = useMutation({
    mutationFn: async (allocId: string) => {
      const { error } = await supabase.from("deal_allocations").delete().eq("id", allocId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["deal-allocations", dealId] }); toast.success("Allocation removed"); },
  });

  const totalAmount = allocations.reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Capital Stack</h3>
          {totalAmount > 0 && <p className="text-xs text-muted-foreground mt-0.5">Total: <span className="font-mono text-primary">${totalAmount.toLocaleString()}</span></p>}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
          <Plus className="h-3 w-3" /> Add Allocation
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <select value={form.allocation_type} onChange={(e) => setForm({ ...form, allocation_type: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground">
              <option value="equity">Equity</option><option value="debt">Debt</option><option value="mezzanine">Mezzanine</option><option value="preferred">Preferred</option>
            </select>
            <input type="number" placeholder="Amount ($)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="text" placeholder="Source / LP" value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="number" placeholder="Ownership %" value={form.ownership_pct} onChange={(e) => setForm({ ...form, ownership_pct: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground" />
            <input type="date" value={form.commitment_date} onChange={(e) => setForm({ ...form, commitment_date: e.target.value })} className="h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground" />
            <button onClick={() => addAllocation.mutate()} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save</button>
          </div>
        </div>
      )}

      {allocations.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No Allocations Yet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">Track equity, debt, and mezzanine commitments. When capital is wired, it gets logged here.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-muted-foreground">
              <th className="text-left px-4 py-2 font-medium text-xs">Type</th>
              <th className="text-right px-4 py-2 font-medium text-xs">Amount</th>
              <th className="text-left px-4 py-2 font-medium text-xs">Source</th>
              <th className="text-right px-4 py-2 font-medium text-xs">Ownership</th>
              <th className="text-left px-4 py-2 font-medium text-xs">Date</th>
              <th className="px-4 py-2"></th>
            </tr></thead>
            <tbody>
              {allocations.map((a: any) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium capitalize">{a.allocation_type}</span></td>
                  <td className="text-right px-4 py-2.5 font-mono text-foreground">{a.amount ? `$${Number(a.amount).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2.5 text-foreground">{a.source_name ?? "—"}</td>
                  <td className="text-right px-4 py-2.5 font-mono text-foreground">{a.ownership_pct ? `${a.ownership_pct}%` : "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{a.commitment_date ?? "—"}</td>
                  <td className="px-4 py-2.5"><button onClick={() => deleteAllocation.mutate(a.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"><Trash2 className="h-3 w-3" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ── Updates Tab ── */
const UpdatesTab = ({ decisions }: { decisions: any[] }) => (
  <div className="max-w-2xl space-y-4">
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Decision History</h3>
      {decisions.length === 0 ? (
        <div className="p-6 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">IC memos, KPI updates, and performance tracking will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {decisions.map((d: any) => (
            <div key={d.id} className="flex items-start gap-2 text-xs border-b border-border/30 pb-2 last:border-0">
              <BookOpen className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-foreground font-medium">{d.decision_type}</span>
                  <span className="text-[10px] text-muted-foreground/60">{format(new Date(d.created_at), "MMM d, yyyy")}</span>
                </div>
                {d.rationale && <p className="text-muted-foreground mt-0.5">{d.rationale}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default DealRoom;
