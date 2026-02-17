import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Clock,
  DollarSign,
  Upload,
  Building2,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Target,
  CheckCircle2,
  Circle,
  Lightbulb,
  ShieldAlert,
  Edit3,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  BookOpen,
  BarChart3,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import PageTransition from "@/components/PageTransition";
import { format, formatDistanceToNow } from "date-fns";
import { DealComments, DecisionLog } from "@/components/DealCollaboration";
import SharedNotes from "@/components/SharedNotes";
import PipelineTasks from "@/components/PipelineTasks";
import { toast } from "sonner";
import { motion } from "framer-motion";
import CompanyAIAssessment from "@/components/CompanyAIAssessment";
import AIResearchChat from "@/components/AIResearchChat";
import NewsFeed from "@/components/NewsFeed";
import InvestmentMemo from "@/components/InvestmentMemo";
import { useAlphaSignals } from "@/hooks/useAlphaSignals";
import { useResearchThreads } from "@/hooks/useResearchThreads";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";
import { useCalendarSync } from "@/hooks/useCalendarSync";

// ── Interest State Machine ──────────────────────────────────────────────
const INTEREST_STATES = [
  { key: "watching", label: "Watching", icon: Circle, color: "text-muted-foreground", bg: "bg-muted/50" },
  { key: "interested", label: "Interested", icon: Target, color: "text-primary", bg: "bg-primary/10" },
  { key: "diligencing", label: "Diligencing", icon: FileText, color: "text-warning", bg: "bg-warning/10" },
  { key: "soft_commit", label: "Soft Commit", icon: TrendingUp, color: "text-chart-4", bg: "bg-chart-4/10" },
  { key: "committed", label: "Committed", icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  { key: "passed", label: "Passed", icon: X, color: "text-destructive", bg: "bg-destructive/10" },
] as const;

type InterestState = typeof INTEREST_STATES[number]["key"];

const STAGE_TO_INTEREST: Record<string, InterestState> = {
  sourced: "watching",
  screening: "interested",
  due_diligence: "diligencing",
  ic_review: "soft_commit",
  committed: "committed",
  passed: "passed",
};

const INTEREST_TO_STAGE: Record<InterestState, string> = {
  watching: "sourced",
  interested: "screening",
  diligencing: "due_diligence",
  soft_commit: "ic_review",
  committed: "committed",
  passed: "passed",
};

// ── Data Hooks ──────────────────────────────────────────────────────────
const useDealRoom = (dealId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["deal-room", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_pipeline")
        .select("*, companies(id, name, sector, stage, founded_year, hq_location, description, employee_count, total_funding, latest_valuation)")
        .eq("id", dealId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!dealId && !!user,
  });
};

const useDealTimeline = (dealId: string | undefined) => {
  return useQuery({
    queryKey: ["deal-timeline", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_log")
        .select("*")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!dealId,
  });
};

// ── Interest State Stepper ──────────────────────────────────────────────
const InterestStepper = ({ currentState, onChangeState, isPending }: {
  currentState: InterestState;
  onChangeState: (state: InterestState) => void;
  isPending: boolean;
}) => {
  const currentIndex = INTEREST_STATES.findIndex((s) => s.key === currentState);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1" role="group" aria-label="Deal interest state">
      {INTEREST_STATES.map((state, i) => {
        const isActive = state.key === currentState;
        const isPast = i < currentIndex && currentState !== "passed";
        const Icon = state.icon;

        return (
          <button
            key={state.key}
            onClick={() => onChangeState(state.key)}
            disabled={isPending}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 whitespace-nowrap disabled:opacity-50
              ${isActive
                ? `${state.bg} ${state.color} ring-1 ring-current/20`
                : isPast
                  ? "text-primary/60 bg-primary/5"
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
              }`}
            aria-pressed={isActive}
          >
            {isPast ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <Icon className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">{state.label}</span>
            {i < INTEREST_STATES.length - 1 && (
              <ChevronRight className="h-3 w-3 ml-0.5 text-muted-foreground/20 hidden md:block" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ── Thesis Card ("What we need to believe") — persisted via deal_pipeline.notes ──
const ThesisCard = ({ deal }: { deal: any }) => {
  const queryClient = useQueryClient();

  // Parse structured notes from deal_pipeline.notes
  const parsed = (() => {
    try {
      if (deal.notes?.startsWith("{")) return JSON.parse(deal.notes);
    } catch { /* fallback */ }
    return { thesis: deal.notes ?? "", risks: "" };
  })();

  const [isEditing, setIsEditing] = useState(false);
  const [thesis, setThesis] = useState(parsed.thesis);
  const [risks, setRisks] = useState(parsed.risks);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("deal_pipeline")
        .update({ notes: JSON.stringify({ thesis, risks }) })
        .eq("id", deal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-room", deal.id] });
      setIsEditing(false);
      toast.success("Thesis saved");
    },
    onError: () => toast.error("Failed to save thesis"),
  });

  const hasContent = thesis.trim().length > 0 || risks.trim().length > 0;

  if (!isEditing && !hasContent) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="w-full rounded-lg border border-dashed border-border bg-card/50 p-5 text-left hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              What we need to believe
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pin the investment thesis and key risks. Makes diligence sharper.
            </p>
          </div>
        </div>
      </button>
    );
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-primary/20 bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" /> What We Need to Believe
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setThesis(parsed.thesis); setRisks(parsed.risks); setIsEditing(false); }}
              className="h-7 px-2.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-7 px-2.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <Save className="h-3 w-3" /> {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5">
            Investment Thesis
          </label>
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="Why does this deal work? What's the core conviction?"
            className="w-full h-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1.5 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Key Risks
          </label>
          <textarea
            value={risks}
            onChange={(e) => setRisks(e.target.value)}
            placeholder="What has to go right? What could kill the deal?"
            className="w-full h-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" /> What We Need to Believe
        </h3>
        <button
          onClick={() => setIsEditing(true)}
          className="h-6 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
        >
          <Edit3 className="h-3 w-3" /> Edit
        </button>
      </div>
      {thesis && (
        <div className="mb-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Thesis</p>
          <p className="text-sm text-foreground leading-relaxed">{thesis}</p>
        </div>
      )}
      {risks && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-destructive/70 mb-1 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Key Risks
          </p>
          <p className="text-sm text-foreground leading-relaxed">{risks}</p>
        </div>
      )}
    </div>
  );
};

// ── Sector Signal Inline Card ────────────────────────────────────────────
const SectorSignalCard = ({ sector }: { sector?: string | null }) => {
  const { data: alphaSignals } = useAlphaSignals();
  const sectorSignal = alphaSignals?.find(s =>
    sector?.toLowerCase().includes(s.sector.toLowerCase()) ||
    s.sector.toLowerCase().includes(sector?.toLowerCase() ?? "")
  );

  if (!sectorSignal) return null;

  const DirectionIcon = sectorSignal.direction === "bullish" ? TrendingUp
    : sectorSignal.direction === "bearish" ? TrendingDown : Minus;
  const dirColor = sectorSignal.direction === "bullish" ? "text-success"
    : sectorSignal.direction === "bearish" ? "text-destructive" : "text-muted-foreground";
  const dirBg = sectorSignal.direction === "bullish" ? "bg-success/10"
    : sectorSignal.direction === "bearish" ? "bg-destructive/10" : "bg-muted/50";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <BarChart3 className="h-3 w-3" /> Sector Signal
        </h3>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${dirBg} ${dirColor} capitalize`}>
          {sectorSignal.direction}
        </span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className={`h-8 w-8 rounded-lg ${dirBg} flex items-center justify-center shrink-0`}>
          <DirectionIcon className={`h-4 w-4 ${dirColor}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{sectorSignal.sector}</p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {sectorSignal.magnitude_pct != null && (
              <span className={`font-mono font-medium ${dirColor}`}>
                {sectorSignal.direction === "bearish" ? "" : "+"}{sectorSignal.magnitude_pct.toFixed(1)}%
              </span>
            )}
            <span>·</span>
            <span>{Math.round(sectorSignal.confidence * 100)}% confidence</span>
          </div>
        </div>
      </div>
      {sectorSignal.reasoning && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{sectorSignal.reasoning}</p>
      )}
    </div>
  );
};

// ── Summary Tab ─────────────────────────────────────────────────────────
const SummaryTab = ({ deal, onSwitchTab }: { deal: any; onSwitchTab: (tab: string) => void }) => {
  const company = deal.companies;
  const navigate = useNavigate();
  const { data: researchThreads } = useResearchThreads(company?.id);
  const threadCount = researchThreads?.length ?? 0;

  return (
    <div className="space-y-5">
      {/* Thesis — the killer feature */}
      <ThesisCard deal={deal} />

      {/* Company Overview */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{company?.name ?? "Unknown Company"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[company?.sector, company?.hq_location].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          {company?.id && (
            <button
              onClick={() => navigate(`/companies/${company.id}`)}
              className="flex items-center gap-1.5 text-[10px] text-primary hover:underline font-medium"
            >
              Full Profile <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>

        {company?.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">{company.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniStat label="Stage" value={company?.stage ?? "—"} />
          <MiniStat label="Founded" value={company?.founded_year ?? "—"} />
          <MiniStat label="Employees" value={company?.employee_count ? company.employee_count.toLocaleString() : "—"} />
          <MiniStat label="Total Funding" value={company?.total_funding ? formatValuation(company.total_funding) : "—"} />
        </div>
      </div>

      {/* Sector Signal */}
      <SectorSignalCard sector={company?.sector} />

      {/* Valuation Snapshot */}
      {company?.latest_valuation && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Valuation
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <MiniStat label="Latest Valuation" value={formatValuation(company.latest_valuation)} />
            <MiniStat label="Total Funding" value={company.total_funding ? formatValuation(company.total_funding) : "—"} />
          </div>
          <div className="mt-3">
            <button
              onClick={() => navigate("/valuations")}
              className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium"
            >
              Open Valuation Toolkit <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* AI Assessment */}
      {company?.id && (
        <CompanyAIAssessment
          sector={company.sector}
          stage={company.stage}
          companyName={company.name ?? "Unknown"}
          companyId={company.id}
        />
      )}

      {/* Research Threads Quick Access */}
      {threadCount > 0 && (
        <button
          onClick={() => onSwitchTab("intelligence")}
          className="w-full rounded-lg border border-border bg-card p-4 text-left hover:border-primary/20 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {threadCount} Research Thread{threadCount !== 1 ? "s" : ""}
                </p>
                <p className="text-[10px] text-muted-foreground">AI research conversations about this company</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>
      )}

      {/* Tasks */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Diligence Tasks</h3>
        <PipelineTasks dealId={deal.id} />
      </div>
    </div>
  );
};

// ── Data Room Tab ───────────────────────────────────────────────────────
const DOC_CATEGORIES = [
  { key: "term_sheet", label: "Term Sheet", icon: FileText, count: 0 },
  { key: "financials", label: "Financials", icon: DollarSign, count: 0 },
  { key: "legal", label: "Legal & Compliance", icon: Building2, count: 0 },
  { key: "diligence", label: "Diligence Materials", icon: Target, count: 0 },
  { key: "pitch", label: "Pitch & Memos", icon: Briefcase, count: 0 },
  { key: "other", label: "Other Documents", icon: Upload, count: 0 },
];

const DataRoomTab = ({ dealId, companyId, companyName }: { dealId: string; companyId?: string; companyName: string }) => {
  const navigate = useNavigate();
  const { isConfigured: isDriveConfigured, syncFiles } = useGoogleDrive();
  const [driveSyncing, setDriveSyncing] = useState(false);

  // Query real document counts by type
  const { data: docCounts } = useQuery({
    queryKey: ["deal-doc-counts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("document_type")
        .eq("company_id", companyId!);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((d: any) => {
        const key = d.document_type ?? "other";
        counts[key] = (counts[key] ?? 0) + 1;
      });
      return counts;
    },
    enabled: !!companyId,
  });

  const categories = DOC_CATEGORIES.map(cat => ({
    ...cat,
    count: docCounts?.[cat.key] ?? 0,
  }));

  const totalDocs = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" /> Data Room
              {totalDocs > 0 && (
                <span className="text-[10px] font-mono text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{totalDocs}</span>
              )}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Structured documents for {companyName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/data-room")}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Global Data Room
            </button>
            {isDriveConfigured && companyId && (
              <button
                onClick={async () => {
                  setDriveSyncing(true);
                  try {
                    await syncFiles(companyId);
                    toast.success("Drive files synced to Data Room");
                  } catch {
                    toast.error("Drive sync failed");
                  } finally {
                    setDriveSyncing(false);
                  }
                }}
                disabled={driveSyncing}
                className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {driveSyncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Sync from Drive
              </button>
            )}
            <button className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5">
              <Upload className="h-3 w-3" /> Upload
            </button>
          </div>
        </div>

        {/* Category grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.key}
              className="text-left rounded-lg border border-dashed border-border p-4 hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <cat.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{cat.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {cat.count > 0 ? `${cat.count} document${cat.count > 1 ? "s" : ""}` : "No documents yet"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Empty state hint */}
        {totalDocs === 0 && (
          <div className="px-5 pb-4">
            <div className="rounded-md bg-muted/20 border border-border/50 p-3 flex items-start gap-3">
              <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-foreground font-medium">Organize diligence materials</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  Upload documents to the right category. Term sheets, financial models, legal docs — everything in one place.
                  Room members with access can view and comment.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Discussion Tab ──────────────────────────────────────────────────────
const DiscussionTab = ({ deal }: { deal: any }) => (
  <div className="space-y-4">
    <div className="rounded-lg border border-border bg-card">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Discussion
        </h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">All Q&A and diligence discussion in one thread.</p>
      </div>
      <div className="p-4">
        <DealComments dealId={deal.id} />
      </div>
    </div>
    {deal.companies?.id && (
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Shared Notes</h3>
        </div>
        <div className="p-4">
          <SharedNotes companyId={deal.companies.id} />
        </div>
      </div>
    )}
  </div>
);

// ── Timeline Tab ────────────────────────────────────────────────────────
const TimelineTab = ({ dealId }: { dealId: string }) => {
  const { data: timeline, isLoading } = useDealTimeline(dealId);
  const { isConfigured: isCalendarConfigured, pushDealEvent } = useCalendarSync();
  const [calSyncing, setCalSyncing] = useState(false);

  const STAGE_LABELS: Record<string, string> = {
    sourced: "Watching", screening: "Interested", due_diligence: "Diligencing",
    ic_review: "Soft Commit", committed: "Committed", passed: "Passed",
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1"><Skeleton className="h-4 w-48 mb-1" /><Skeleton className="h-3 w-32" /></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Timeline
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Every decision, stage change, and milestone — tracked.</p>
        </div>
        {isCalendarConfigured && (
          <button
            onClick={async () => {
              setCalSyncing(true);
              try {
                await pushDealEvent(dealId, { title: "Deal timeline sync", type: "milestone" });
                toast.success("Timeline synced to calendar");
              } catch {
                toast.error("Calendar sync failed");
              } finally {
                setCalSyncing(false);
              }
            }}
            disabled={calSyncing}
            className="h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {calSyncing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Calendar className="h-3 w-3" />}
            Sync to Calendar
          </button>
        )}
      </div>
      {timeline && timeline.length > 0 ? (
        <div className="p-5">
          <div className="relative space-y-5">
            <div className="absolute left-[9px] top-3 bottom-3 w-px bg-border" />
            {timeline.map((entry: any, i: number) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="relative flex gap-4"
              >
                <div className="relative z-10 h-[18px] w-[18px] rounded-full bg-card border-2 border-primary/30 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium capitalize">{entry.decision_type?.replace("_", " ")}</span>
                    {entry.from_state && entry.to_state && (
                      <span className="text-muted-foreground">
                        {" "}{STAGE_LABELS[entry.from_state] ?? entry.from_state} → {STAGE_LABELS[entry.to_state] ?? entry.to_state}
                      </span>
                    )}
                  </p>
                  {entry.rationale && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{entry.rationale}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
                    {entry.created_at && format(new Date(entry.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-10 text-center text-muted-foreground">
          <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm font-medium">No timeline events yet</p>
          <p className="text-xs mt-1">Stage changes, decisions, and milestones will appear here.</p>
        </div>
      )}
    </div>
  );
};

// ── Allocation Tab (the "OS" part) — localStorage-persisted ─────────────
const ALLOC_KEY = (dealId: string) => `grapevine-allocation-${dealId}`;
const CHECKLIST_KEY = (dealId: string) => `grapevine-checklist-${dealId}`;

const AllocationTab = ({ deal }: { deal: any }) => {
  const navigate = useNavigate();
  const interestState = STAGE_TO_INTEREST[deal.stage] ?? "watching";

  // localStorage-persisted allocation
  const storedAlloc = (() => {
    try { return JSON.parse(localStorage.getItem(ALLOC_KEY(deal.id)) ?? "{}"); } catch { return {}; }
  })();
  const [isEditingAlloc, setIsEditingAlloc] = useState(false);
  const [allocValues, setAllocValues] = useState({
    targetAmount: storedAlloc.targetAmount ?? null as number | null,
    softCircle: storedAlloc.softCircle ?? null as number | null,
    committed: storedAlloc.committed ?? null as number | null,
    cap: storedAlloc.cap ?? null as number | null,
  });

  const remaining = (allocValues.targetAmount ?? 0) - (allocValues.committed ?? 0) - (allocValues.softCircle ?? 0);

  const saveAllocation = () => {
    localStorage.setItem(ALLOC_KEY(deal.id), JSON.stringify(allocValues));
    setIsEditingAlloc(false);
    toast.success("Allocation saved");
  };

  // localStorage-persisted checklist
  const storedChecklist: Record<string, boolean> = (() => {
    try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY(deal.id)) ?? "{}"); } catch { return {}; }
  })();

  const CHECKLIST_ITEMS = [
    { id: "term_sheet", label: "Term sheet reviewed" },
    { id: "legal_review", label: "Legal review complete" },
    { id: "ic_approval", label: "IC approval" },
    { id: "docs_signed", label: "Documents signed" },
    { id: "wire_sent", label: "Wire sent" },
  ];

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    ...Object.fromEntries(CHECKLIST_ITEMS.map(i => [i.id, false])),
    ic_approval: deal.stage === "committed" || deal.stage === "ic_review",
    ...storedChecklist,
  });

  const toggleCheck = (id: string) => {
    const next = { ...checklist, [id]: !checklist[id] };
    setChecklist(next);
    localStorage.setItem(CHECKLIST_KEY(deal.id), JSON.stringify(next));
  };

  const parseAmount = (val: string) => {
    const n = parseFloat(val.replace(/[^0-9.]/g, ""));
    return isNaN(n) ? null : n * 1e6; // input in $M
  };

  return (
    <div className="space-y-5">
      {/* Allocation Summary */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Allocation
          </h3>
          {!isEditingAlloc && (
            <button
              onClick={() => setIsEditingAlloc(true)}
              className="h-6 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              <Edit3 className="h-3 w-3" /> Edit
            </button>
          )}
        </div>

        {isEditingAlloc ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { key: "targetAmount", label: "Target ($M)" },
                { key: "softCircle", label: "Soft Circle ($M)" },
                { key: "committed", label: "Committed ($M)" },
                { key: "cap", label: "Cap ($M)" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground block mb-1">{field.label}</label>
                  <input
                    type="text"
                    defaultValue={allocValues[field.key as keyof typeof allocValues] ? ((allocValues[field.key as keyof typeof allocValues] as number) / 1e6).toFixed(1) : ""}
                    onChange={(e) => setAllocValues(prev => ({ ...prev, [field.key]: parseAmount(e.target.value) }))}
                    placeholder="0.0"
                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setIsEditingAlloc(false)} className="h-7 px-2.5 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
              <button onClick={saveAllocation} className="h-7 px-3 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors flex items-center gap-1">
                <Save className="h-3 w-3" /> Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <AllocationStat label="Target" value={allocValues.targetAmount ? formatValuation(allocValues.targetAmount) : "—"} />
              <AllocationStat label="Soft Circle" value={allocValues.softCircle ? formatValuation(allocValues.softCircle) : "—"} accent="warning" />
              <AllocationStat label="Committed" value={allocValues.committed ? formatValuation(allocValues.committed) : "—"} accent="success" />
              <AllocationStat label="Remaining" value={allocValues.targetAmount ? formatValuation(remaining) : "—"} />
            </div>

            {/* Interest state as context */}
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted/30 border border-border/50">
              <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Current state: <span className="font-medium text-foreground capitalize">{interestState.replace("_", " ")}</span>
                {interestState === "soft_commit" && " — ready for IC review and final commitment"}
                {interestState === "committed" && " — allocation confirmed, proceed to close"}
                {interestState === "watching" && " — monitoring, not yet active in diligence"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Close Checklist */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Close Checklist</h3>
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => (
            <label
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                checklist[item.id] ? "bg-success border-success" : "border-border"
              }`}>
                {checklist[item.id] && <CheckCircle2 className="h-3 w-3 text-success-foreground" />}
              </div>
              <span className={`text-sm ${checklist[item.id] ? "text-muted-foreground line-through" : "text-foreground"}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Decision Log */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Decision Log</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">IC votes, rationale, and outcomes.</p>
        </div>
        <div className="p-4">
          <DecisionLog dealId={deal.id} />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <button
          onClick={() => navigate("/portfolio")}
          className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
        >
          View Portfolio <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

// ── Intelligence Tab ────────────────────────────────────────────────────
const IntelligenceTab = ({ deal }: { deal: any }) => {
  const company = deal.companies;
  if (!company?.id) {
    return (
      <div className="rounded-lg border border-border bg-card p-16 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground font-medium">No company linked to this deal</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* AI Research Chat */}
      <AIResearchChat
        companyId={company.id}
        companyName={company.name ?? "Unknown"}
        sector={company.sector}
        dealId={deal.id}
      />

      {/* News + Investment Memo side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <NewsFeed companyId={company.id} compact />
        <InvestmentMemo companyId={company.id} companyName={company.name ?? "Unknown"} />
      </div>
    </div>
  );
};

// ── Header Signal Badge ─────────────────────────────────────────────────
const HeaderSignalBadge = ({ sector }: { sector?: string | null }) => {
  const { data: alphaSignals } = useAlphaSignals();
  const signal = alphaSignals?.find(s =>
    sector?.toLowerCase().includes(s.sector.toLowerCase()) ||
    s.sector.toLowerCase().includes(sector?.toLowerCase() ?? "")
  );
  if (!signal) return null;

  const dirColor = signal.direction === "bullish" ? "text-success"
    : signal.direction === "bearish" ? "text-destructive" : "text-muted-foreground";
  const dirBg = signal.direction === "bullish" ? "bg-success/10"
    : signal.direction === "bearish" ? "bg-destructive/10" : "bg-muted/50";
  const DirectionIcon = signal.direction === "bullish" ? TrendingUp
    : signal.direction === "bearish" ? TrendingDown : Minus;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${dirBg} ${dirColor}`}>
      <DirectionIcon className="h-2.5 w-2.5" />
      {signal.direction}
      {signal.magnitude_pct != null && <span className="font-mono">{signal.magnitude_pct > 0 ? "+" : ""}{signal.magnitude_pct.toFixed(1)}%</span>}
    </span>
  );
};

// ── Main Deal Room Page ─────────────────────────────────────────────────
const DealRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: deal, isLoading, error } = useDealRoom(id);
  const [activeTab, setActiveTab] = useState("summary");

  const updateStage = useMutation({
    mutationFn: async (newStage: string) => {
      const { error } = await supabase.from("deal_pipeline").update({ stage: newStage }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-room", id] });
      toast.success("Deal state updated");
    },
    onError: () => toast.error("Failed to update state"),
  });

  const handleInterestChange = (state: InterestState) => {
    const stage = INTEREST_TO_STAGE[state];
    if (stage && stage !== deal?.stage) {
      updateStage.mutate(stage);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-full max-w-2xl" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="p-6">
        <button onClick={() => navigate("/deals")} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Deals
        </button>
        <div className="rounded-lg border border-border bg-card p-16 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground">Deal not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This deal may have been removed or you may not have access.</p>
          <button onClick={() => navigate("/deals")} className="mt-5 h-9 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Go to Deals
          </button>
        </div>
      </div>
    );
  }

  const companyName = deal.companies?.name ?? "Unknown";
  const currentInterest = STAGE_TO_INTEREST[deal.stage] ?? "watching";

  return (
    <PageTransition>
      <div className="p-3 sm:p-6 space-y-4">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate("/deals")}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Deals
        </button>

        {/* Header */}
        <div className="space-y-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              {companyName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {deal.companies?.sector && <span>{deal.companies.sector}</span>}
                {deal.companies?.sector && deal.updated_at && <span>·</span>}
                {deal.updated_at && (
                  <span>Updated {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}</span>
                )}
              </p>
              <HeaderSignalBadge sector={deal.companies?.sector} />
            </div>
          </div>

          {/* Interest State Stepper */}
          <InterestStepper
            currentState={currentInterest}
            onChangeState={handleInterestChange}
            isPending={updateStage.isPending}
          />
        </div>

        {/* Quick Context Links */}
        <div className="flex items-center gap-2 flex-wrap">
          {deal.companies?.id && (
            <button
              onClick={() => navigate(`/companies/${deal.companies.id}`)}
              className="h-7 px-2.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
            >
              <Building2 className="h-3 w-3" /> Company Profile
            </button>
          )}
          <button
            onClick={() => navigate("/valuations")}
            className="h-7 px-2.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
          >
            <DollarSign className="h-3 w-3" /> Valuation Toolkit
          </button>
          <button
            onClick={() => navigate("/sector-pulse")}
            className="h-7 px-2.5 rounded-md border border-border text-[10px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
          >
            <BarChart3 className="h-3 w-3" /> Sector Pulse
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 gap-0 overflow-x-auto">
            {[
              { value: "summary", label: "Summary", icon: FileText },
              { value: "intelligence", label: "Intelligence", icon: Sparkles },
              { value: "data-room", label: "Data Room", icon: Upload },
              { value: "discussion", label: "Discussion", icon: MessageSquare },
              { value: "timeline", label: "Timeline", icon: Clock },
              { value: "allocation", label: "Allocation", icon: DollarSign },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                <tab.icon className="h-3.5 w-3.5 mr-1.5 inline-block" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="summary" className="mt-5">
            <SummaryTab deal={deal} onSwitchTab={setActiveTab} />
          </TabsContent>
          <TabsContent value="intelligence" className="mt-5">
            <IntelligenceTab deal={deal} />
          </TabsContent>
          <TabsContent value="data-room" className="mt-5">
            <DataRoomTab dealId={deal.id} companyId={deal.companies?.id} companyName={companyName} />
          </TabsContent>
          <TabsContent value="discussion" className="mt-5">
            <DiscussionTab deal={deal} />
          </TabsContent>
          <TabsContent value="timeline" className="mt-5">
            <TimelineTab dealId={deal.id} />
          </TabsContent>
          <TabsContent value="allocation" className="mt-5">
            <AllocationTab deal={deal} />
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

// ── Helpers ─────────────────────────────────────────────────────────────
function MiniStat({ label, value, badge, badgeClass }: {
  label: string; value: string | number; badge?: boolean; badgeClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      {badge ? (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badgeClass ?? "bg-muted text-muted-foreground"}`}>{value}</span>
      ) : (
        <p className="text-sm font-medium text-foreground">{value}</p>
      )}
    </div>
  );
}

function AllocationStat({ label, value, accent }: { label: string; value: string; accent?: "warning" | "success" }) {
  const color = accent === "warning" ? "text-warning" : accent === "success" ? "text-success" : "text-foreground";
  return (
    <div className="p-3 rounded-md bg-muted/20 border border-border/50">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-lg font-semibold font-mono ${color}`}>{value}</p>
    </div>
  );
}

function formatValuation(val: number): string {
  if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

export default DealRoom;
