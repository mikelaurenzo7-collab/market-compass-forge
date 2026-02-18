import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, FileText, MessageSquare, Clock, PieChart, Bell, LayoutDashboard, ChevronRight } from "lucide-react";
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
  { id: "data-room", label: "Data Room", icon: FileText },
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
        .select("*, companies(id, name, sector, stage, description, hq_country, employee_count, founded_year)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

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
    enabled: !!id && (activeTab === "timeline" || activeTab === "summary"),
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
    enabled: !!id && (activeTab === "discussion" || activeTab === "summary"),
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (e.key === "ArrowRight" && idx < TABS.length - 1) {
      setActiveTab(TABS[idx + 1].id);
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      setActiveTab(TABS[idx - 1].id);
      e.preventDefault();
    }
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
        <button onClick={() => navigate("/deals")} className="mt-3 text-sm text-primary hover:underline">
          Back to Deals
        </button>
      </div>
    );
  }

  const company = deal.companies as any;

  return (
    <PageTransition>
      <div className="flex flex-col h-full">
        {/* Breadcrumb + header */}
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
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
          <div
            role="tablist"
            aria-label="Deal room tabs"
            className="flex items-center gap-1 mt-4 -mb-px overflow-x-auto"
            onKeyDown={handleKeyDown}
          >
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
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1 rounded-t-sm ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
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
          <div
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={activeTab}
            className="p-4 sm:p-6"
          >
            {activeTab === "summary" && (
              <SummaryTab company={company} deal={deal} decisions={decisions} comments={comments} />
            )}
            {activeTab === "data-room" && <PlaceholderTab icon={FileText} title="Data Room" description="Upload and organize diligence documents for this deal. Drag & drop files to get started." action="Upload Files" />}
            {activeTab === "discussion" && <DiscussionTab comments={comments ?? []} dealId={id!} />}
            {activeTab === "timeline" && <TimelineTab decisions={decisions ?? []} />}
            {activeTab === "allocation" && <PlaceholderTab icon={PieChart} title="Allocation" description="Track capital allocation, commitments, and fund-level exposure for this deal." />}
            {activeTab === "updates" && <PlaceholderTab icon={Bell} title="Updates" description="Deal updates, memos, and activity notifications will appear here as you work through diligence." />}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

/* ── Summary Tab ── */
const SummaryTab = ({ company, deal, decisions, comments }: any) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      <div className="lg:col-span-2 space-y-5">
        {/* Company overview */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Overview</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {company?.description ?? "No company description available. Add details in the company profile."}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {company?.sector && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Sector</p>
                <p className="text-sm text-foreground mt-0.5">{company.sector}</p>
              </div>
            )}
            {company?.stage && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Stage</p>
                <p className="text-sm text-foreground mt-0.5">{company.stage}</p>
              </div>
            )}
            {company?.employee_count && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Employees</p>
                <p className="text-sm text-foreground mt-0.5">{company.employee_count.toLocaleString()}</p>
              </div>
            )}
            {company?.founded_year && (
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Founded</p>
                <p className="text-sm text-foreground mt-0.5">{company.founded_year}</p>
              </div>
            )}
          </div>
        </div>

        {/* Deal notes */}
        {deal.notes && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Deal Notes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{deal.notes}</p>
          </div>
        )}

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
                    <p className="text-muted-foreground/60 mt-0.5">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Deal Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Stage</span>
              <span className="text-primary font-medium">{STAGE_LABELS[deal.stage] ?? deal.stage}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Priority</span>
              <span className="text-foreground">{deal.priority ?? "—"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Updated</span>
              <span className="text-foreground">{formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Quick Stats</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Decisions</span>
              <span className="font-mono text-foreground">{decisions?.length ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comments</span>
              <span className="font-mono text-foreground">{comments?.length ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Discussion Tab ── */
const DiscussionTab = ({ comments, dealId }: { comments: any[]; dealId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const addComment = useMutation({
    mutationFn: async () => {
      if (!newComment.trim() || !user) return;
      const { error } = await supabase.from("deal_comments").insert({
        deal_id: dealId,
        user_id: user.id,
        content: newComment.trim(),
      });
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
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && addComment.mutate()}
          placeholder="Add a comment..."
          className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        <button
          onClick={() => addComment.mutate()}
          disabled={!newComment.trim()}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Post
        </button>
      </div>
      {comments.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Start the conversation about this deal</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c: any) => (
            <div key={c.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-muted-foreground">{c.user_id.slice(0, 8)}</span>
                <span className="text-[10px] text-muted-foreground/60">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
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
        <p className="text-xs text-muted-foreground/60 mt-1">Stage changes, votes, and notes will appear here as the deal progresses</p>
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
                {d.from_state && d.to_state && (
                  <span className="text-[10px] text-muted-foreground">
                    {d.from_state} → {d.to_state}
                  </span>
                )}
              </div>
              {d.rationale && <p className="text-xs text-muted-foreground mt-1">{d.rationale}</p>}
              <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                {format(new Date(d.created_at), "MMM d, yyyy h:mm a")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Placeholder Tab ── */
const PlaceholderTab = ({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: string }) => (
  <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center max-w-lg mx-auto">
    <Icon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
    <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    {action && (
      <button className="mt-4 h-8 px-4 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        {action}
      </button>
    )}
  </div>
);

export default DealRoom;
