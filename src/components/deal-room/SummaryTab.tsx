import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Edit3, BarChart3, TrendingUp, Clock, CheckCircle, XCircle, FileText, Loader2, Building2 } from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { toast } from "sonner";
import MetricItem from "./MetricItem";
import ValuationRangesSection from "./ValuationRangesSection";
import RelationshipGraph from "@/components/RelationshipGraph";
import HistoricalPrecedent from "./HistoricalPrecedent";
import AssetKPIs from "./AssetKPIs";
import DealTasksPanel from "./DealTasksPanel";
import LastModified from "@/components/LastModified";
import { STAGE_LABELS } from "./types";
import { formatCurrencyCompact, formatPercent } from "@/lib/format";

interface SummaryTabProps {
  company: any;
  deal: any;
  decisions: any[] | null;
  comments: any[] | null;
  financials: any[] | null;
  fundingRounds: any[] | null;
  documents: any[] | null;
  allocations: any[] | null;
  enrichments: any[] | null;
  votes: any[] | null;
  onSaveThesis: (thesis: string) => void;
  companyId?: string;
  dealId?: string;
  dealMode: string;
  onToggleDealMode: (mode: string) => void;
}

const SummaryTab = ({ company, deal, decisions, comments, financials, fundingRounds, documents, allocations, enrichments, votes, onSaveThesis, companyId, dealId, dealMode, onToggleDealMode }: SummaryTabProps) => {
  const { user } = useAuth();
  const [editingThesis, setEditingThesis] = useState(false);
  const [thesis, setThesis] = useState((deal as any).thesis ?? "");
  const [memoContent, setMemoContent] = useState<any>(null);
  const latestFinancial = financials?.[0];
  const totalAllocated = (allocations ?? []).reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
  const yesVotes = (votes ?? []).filter((v: any) => v.vote === "yes").length;
  const noVotes = (votes ?? []).filter((v: any) => v.vote === "no").length;

  const generateMemo = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company ID");
      const { data, error } = await supabase.functions.invoke("generate-memo", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setMemoContent(data.memo);
      toast.success("IC Memo generated");
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to generate memo");
    },
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
      <div className="lg:col-span-2 space-y-5">
        {/* Deal Mode Toggle */}
        <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Deal Type</span>
          </div>
          <div className="flex items-center gap-1 bg-secondary/50 rounded-md p-0.5">
            <button
              onClick={() => onToggleDealMode("enterprise")}
              className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${dealMode === "enterprise" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Enterprise
            </button>
            <button
              onClick={() => onToggleDealMode("asset")}
              className={`px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${dealMode === "asset" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Asset / Real Estate
            </button>
          </div>
        </div>

        {/* Asset KPIs (Real Estate mode) */}
        {dealMode === "asset" && <AssetKPIs />}

        {/* Thesis */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Edit3 className="h-3.5 w-3.5 text-primary" /> Investment Thesis
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateMemo.mutate()}
                disabled={generateMemo.isPending || !companyId}
                className="h-7 px-3 rounded-md border border-primary/30 bg-primary/5 text-[10px] text-primary font-medium hover:bg-primary/10 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {generateMemo.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                {generateMemo.isPending ? "Generating..." : "Generate IC Memo"}
              </button>
              <button onClick={() => { if (editingThesis) onSaveThesis(thesis); setEditingThesis(!editingThesis); }} className="text-[10px] text-primary hover:underline">
                {editingThesis ? "Save" : "Edit"}
              </button>
            </div>
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
          <LastModified timestamp={deal.updated_at} userId={deal.user_id} />
        </div>

        {/* IC Memo Output */}
        {memoContent && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Investment Memo — {memoContent.company_name}
              </h3>
              <span className="text-[10px] text-muted-foreground">{memoContent.date}</span>
            </div>
            {[
              { label: "Executive Summary", content: memoContent.executive_summary },
              { label: "Investment Thesis", content: memoContent.thesis },
              { label: "Market Analysis", content: memoContent.market },
              { label: "Traction & Financials", content: memoContent.traction },
              { label: "Management", content: memoContent.management },
              { label: "Competitive Landscape", content: memoContent.competitive_landscape },
              { label: "Risks", content: memoContent.risks },
              { label: "Valuation", content: memoContent.valuation },
              { label: "Terms & Structure", content: memoContent.terms_structure },
              { label: "Recommendation", content: memoContent.recommendation },
            ].map(({ label, content }) => content && (
              <div key={label}>
                <h4 className="text-xs font-semibold text-foreground mb-1">{label}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Key Financials */}
        {latestFinancial && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Key Financials
              <span className="text-[10px] text-muted-foreground font-normal ml-auto">{latestFinancial.period}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {latestFinancial.revenue != null && <MetricItem label="Revenue" value={formatCurrencyCompact(latestFinancial.revenue)} />}
              {latestFinancial.ebitda != null && <MetricItem label="EBITDA" value={formatCurrencyCompact(latestFinancial.ebitda)} />}
              {latestFinancial.gross_margin != null && <MetricItem label="Gross Margin" value={formatPercent(latestFinancial.gross_margin * 100, 1)} />}
              {latestFinancial.arr != null && <MetricItem label="ARR" value={formatCurrencyCompact(latestFinancial.arr)} />}
              {latestFinancial.burn_rate != null && <MetricItem label="Burn Rate" value={`${formatCurrencyCompact(Math.abs(latestFinancial.burn_rate))}/mo`} highlight="destructive" />}
              {latestFinancial.runway_months != null && <MetricItem label="Runway" value={`${latestFinancial.runway_months} months`} />}
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

        {/* Relationship Graph */}
        {companyId && (
          <RelationshipGraph companyId={companyId} companyName={company?.name ?? "Company"} />
        )}
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
                    {r.lead_investors?.length > 0 && <span className="text-muted-foreground ml-2">· Led by {r.lead_investors[0]}</span>}
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
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Age</span><span className="text-foreground font-mono">{differenceInDays(new Date(), new Date(deal.created_at))} days</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Updated</span><span className="text-foreground">{formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}</span></div>
            {totalAllocated > 0 && (
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Allocated</span><span className="text-success font-mono tabular-nums font-medium">{formatCurrencyCompact(totalAllocated)}</span></div>
            )}
            {(yesVotes > 0 || noVotes > 0) && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">IC Votes</span>
                <span className="flex items-center gap-2">
                  <span className="text-success font-mono">{yesVotes} yes</span>
                  <span className="text-destructive font-mono">{noVotes} no</span>
                </span>
              </div>
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
            <div className="flex justify-between"><span className="text-muted-foreground">Enrichments</span><span className="font-mono text-foreground">{enrichments?.length ?? 0}</span></div>
          </div>
        </div>

        {/* Valuation Ranges from Sensitivity Analysis */}
        <ValuationRangesSection dealId={dealId} />

        {/* Stage Tasks */}
        {dealId && <DealTasksPanel dealId={dealId} currentStage={deal.stage} />}

        {/* Historical Precedent */}
        {companyId && dealId && <HistoricalPrecedent companyId={companyId} dealId={dealId} />}

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

export default SummaryTab;
