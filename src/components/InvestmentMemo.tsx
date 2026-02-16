import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Download, Sparkles, Copy, Check, Plus, Printer, ShieldCheck, AlertTriangle, ChevronRight, Package } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLogger";
import { useAuth } from "@/hooks/useAuth";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import UpgradePrompt from "@/components/UpgradePrompt";
import { type Citation, type ReviewState, REVIEW_STATES, canTransition, confidenceLabel } from "@/lib/citationEngine";

type Memo = {
  company_name: string;
  date: string;
  executive_summary: string;
  thesis: string;
  market: string;
  traction: string;
  management: string;
  competitive_landscape: string;
  risks: string;
  valuation: string;
  terms_structure: string;
  recommendation: string;
};

const SECTIONS: { key: keyof Omit<Memo, "company_name" | "date">; label: string; icon: string }[] = [
  { key: "executive_summary", label: "Executive Summary", icon: "📋" },
  { key: "thesis", label: "Investment Thesis", icon: "💡" },
  { key: "market", label: "Market Analysis", icon: "📊" },
  { key: "traction", label: "Traction & Metrics", icon: "📈" },
  { key: "management", label: "Management Team", icon: "👥" },
  { key: "competitive_landscape", label: "Competitive Landscape", icon: "⚔️" },
  { key: "risks", label: "Key Risks", icon: "⚠️" },
  { key: "valuation", label: "Valuation Analysis", icon: "💰" },
  { key: "terms_structure", label: "Terms & Structure", icon: "📜" },
  { key: "recommendation", label: "Recommendation", icon: "✅" },
];

const ReviewStateBadge = ({ state }: { state: ReviewState }) => {
  const colors: Record<ReviewState, string> = {
    draft: "bg-muted text-muted-foreground",
    analyst_reviewed: "bg-primary/10 text-primary",
    ic_ready: "bg-success/10 text-success",
  };
  const labels: Record<ReviewState, string> = {
    draft: "Draft",
    analyst_reviewed: "Analyst Reviewed",
    ic_ready: "IC Ready",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[state]}`}>
      {labels[state]}
    </span>
  );
};

const CitationTooltip = ({ citation }: { citation: Citation }) => {
  const { text, className } = confidenceLabel(citation.confidence);
  const isUrl = typeof citation.value === "string" && citation.value.startsWith("http");
  return (
    <span className="group relative inline cursor-help">
      {isUrl ? (
        <a href={citation.value as string} target="_blank" rel="noopener noreferrer" className={`text-[9px] font-mono px-1 rounded ${className} underline decoration-dotted`}>[{citation.id}]</a>
      ) : (
        <span className={`text-[9px] font-mono px-1 rounded ${className}`}>[{citation.id}]</span>
      )}
      <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 w-72 p-2 rounded border border-border bg-popover text-popover-foreground shadow-lg text-[10px]">
        <strong>{citation.metric}</strong>: {citation.formattedValue}<br />
        Source: {citation.source}.{citation.sourceField}<br />
        Confidence: <span className={className}>{text}</span><br />
        Verified: {citation.verifiedAt?.split("T")[0] ?? "Unknown"}
        {isUrl && (
          <>
            <br />
            <a href={citation.value as string} target="_blank" rel="noopener noreferrer" className="text-primary underline mt-1 inline-block">
              View Source →
            </a>
          </>
        )}
      </span>
    </span>
  );
};

const buildMemoHTML = (memo: Memo, citations: Citation[], reviewState: ReviewState, includeDiligencePack: boolean) => {
  const citationRows = citations.map(c => {
    const isUrl = typeof c.value === "string" && (c.value as string).startsWith("http");
    return `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:4px;font-family:monospace">${c.id}</td><td style="padding:4px">${c.metric}</td><td style="padding:4px">${c.formattedValue}</td><td style="padding:4px">${isUrl ? `<a href="${c.value}" style="color:#0ea5e9">${c.source} ↗</a>` : c.source}</td><td style="padding:4px">${c.confidence === "low" || c.confidence === "unverified" ? `<span style="background:#fef3c7;padding:1px 4px;border-radius:2px;font-size:11px">⚠️ ${c.confidence}</span>` : c.confidence}</td><td style="padding:4px">${c.verifiedAt?.split("T")[0] ?? "N/A"}</td></tr>`;
  }).join("");

  const evidenceSection = includeDiligencePack ? `
    <div class="section" style="page-break-before:always">
      <h2>📦 Diligence Pack — Evidence Index</h2>
      <p style="font-size:11px;color:#64748b;margin-bottom:12px">All data sources referenced in this memo, with provenance links and confidence ratings.</p>
      <table style="width:100%;font-size:10px;border-collapse:collapse">
        <tr style="border-bottom:2px solid #e2e8f0;background:#f8fafc"><th style="text-align:left;padding:6px">ID</th><th style="text-align:left;padding:6px">Metric / Source</th><th style="text-align:left;padding:6px">Value</th><th style="text-align:left;padding:6px">Data Source</th><th style="text-align:center;padding:6px">Confidence</th><th style="text-align:left;padding:6px">Verified</th></tr>
        ${citationRows}
      </table>
    </div>
    <div class="section">
      <h2>⚠️ Data Quality Summary</h2>
      <ul style="font-size:12px">
        <li><strong>High confidence:</strong> ${citations.filter(c => c.confidence === "high").length} metrics</li>
        <li><strong>Medium confidence:</strong> ${citations.filter(c => c.confidence === "medium").length} metrics</li>
        <li style="color:#d97706"><strong>Low / Unverified:</strong> ${citations.filter(c => c.confidence === "low" || c.confidence === "unverified").length} metrics — marked with ⚠️ in memo</li>
        <li><strong>Enrichment sources (web-scraped):</strong> ${citations.filter(c => c.source === "company_enrichments").length}</li>
        <li><strong>Uploaded documents:</strong> ${citations.filter(c => c.source === "company_documents").length}</li>
      </ul>
    </div>` : "";

  return `<!DOCTYPE html><html><head><title>${includeDiligencePack ? "Diligence Pack" : "Investment Memo"} — ${memo.company_name}</title><style>body{font-family:Georgia,serif;color:#1a1a1a;line-height:1.65;padding:48px 56px;max-width:820px;margin:0 auto}.cover{text-align:center;padding:40px 0 32px;border-bottom:4px solid #0ea5e9;margin-bottom:32px}.cover h1{font-size:32px;font-weight:700;color:#0c4a6e;margin-bottom:6px}.cover .sub{font-size:14px;color:#94a3b8;margin-top:4px}.cover .date{font-size:13px;color:#64748b;font-family:'Courier New',monospace}.section{margin-bottom:24px;page-break-inside:avoid}.section h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}.section p,.section li{font-size:13px;color:#334155;margin-bottom:8px}.footer{margin-top:36px;padding-top:16px;border-top:2px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}a{color:#0ea5e9}@media print{body{padding:36px}@page{margin:1.5cm;size:A4}}</style></head><body><div class="cover"><h1>${memo.company_name}</h1>${includeDiligencePack ? '<div class="sub">Diligence Pack — Memo + Evidence + Risks</div>' : ""}<div class="date">${memo.date} · ${REVIEW_STATES.find(s => s.key === reviewState)?.label ?? "Draft"}</div></div>${SECTIONS.map(({ key, label, icon }) => `<div class="section"><h2>${icon} ${label}</h2><div>${memo[key].replace(/\n/g, "<br/>")}</div></div>`).join("")}<div class="section"><h2>📎 Citation Appendix</h2><table style="width:100%;font-size:10px;border-collapse:collapse"><tr style="border-bottom:1px solid #e2e8f0"><th style="text-align:left;padding:4px">ID</th><th style="text-align:left;padding:4px">Metric</th><th style="text-align:left;padding:4px">Value</th><th style="text-align:left;padding:4px">Source</th><th style="text-align:left;padding:4px">Confidence</th><th style="text-align:left;padding:4px">Verified</th></tr>${citationRows}</table></div>${evidenceSection}<div class="footer">Generated by Grapevine Intelligence · ${memo.date}<br/><strong>DISCLAIMER:</strong> For informational purposes only — not investment advice.</div></body></html>`;
};

const InvestmentMemo = ({ companyId, companyName }: { companyId: string; companyName: string }) => {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [lowConfidenceMetrics, setLowConfidenceMetrics] = useState<string[]>([]);
  const [reviewState, setReviewState] = useState<ReviewState>("draft");
  const [memoSnapshotId, setMemoSnapshotId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [addedToPipeline, setAddedToPipeline] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const memoRef = useRef<HTMLDivElement>(null);
  const { checkAndTrack, showUpgrade, blockedAction, dismissUpgrade } = useUsageTracking();

  const addToPipeline = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deal_pipeline").insert({
        company_id: companyId,
        user_id: user!.id,
        stage: "sourced",
        notes: `Memo generated on ${memo?.date ?? new Date().toLocaleDateString()}`,
      });
      if (error) throw error;
      logActivity({ userId: user!.id, action: "added to pipeline after memo", entityType: "deal", entityId: companyId, entityName: companyName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      setAddedToPipeline(true);
      toast({ title: "Added to pipeline" });
    },
  });

  const transitionReview = async (toState: ReviewState) => {
    if (!memoSnapshotId || !user) return;
    if (!canTransition(reviewState, toState)) {
      toast({ title: "Invalid transition", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("memo_reviews").insert({
      memo_id: memoSnapshotId,
      reviewer_id: user.id,
      from_state: reviewState,
      to_state: toState,
      comment: reviewComment || null,
    });
    if (error) {
      toast({ title: "Failed to update review state", variant: "destructive" });
      return;
    }
    await supabase.from("memo_snapshots").update({ review_state: toState }).eq("id", memoSnapshotId);
    setReviewState(toState);
    setReviewComment("");
    setShowReview(false);
    logActivity({ userId: user.id, action: `moved memo to ${toState}`, entityType: "memo", entityId: memoSnapshotId, entityName: companyName });
    toast({ title: `Memo moved to ${REVIEW_STATES.find(s => s.key === toState)?.label}` });
  };

  const generate = async () => {
    const allowed = await checkAndTrack("memo_generation");
    if (!allowed) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-memo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ company_id: companyId }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      setMemo(data.memo);
      setCitations(data.citations ?? []);
      setLowConfidenceMetrics(data.lowConfidenceMetrics ?? []);
      setReviewState(data.reviewState ?? "draft");

      // Fetch the latest snapshot ID
      const { data: snapshots } = await supabase
        .from("memo_snapshots")
        .select("id")
        .eq("company_id", companyId)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (snapshots?.[0]) setMemoSnapshotId(snapshots[0].id);

      if (user) {
        logActivity({ userId: user.id, action: "generated investment memo for", entityType: "company", entityId: companyId, entityName: companyName });
      }
    } catch (e: any) {
      setError(e.message || "Failed to generate memo");
    } finally {
      setIsLoading(false);
    }
  };

  const toMarkdown = () => {
    if (!memo) return "";
    return `# Investment Memo: ${memo.company_name}\n_${memo.date} · Confidential_\n\n${SECTIONS.map(
      ({ key, label, icon }) => `## ${icon} ${label}\n\n${memo[key]}`
    ).join("\n\n---\n\n")}\n\n---\n\n## Citations\n\n${citations.map(c => `- [${c.id}] ${c.metric}: ${c.formattedValue} (${c.source}, confidence: ${c.confidence}, verified: ${c.verifiedAt?.split("T")[0]})`).join("\n")}\n\n---\n\n_Disclaimer: For informational purposes only — not investment advice._`;
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(toMarkdown());
    setCopied(true);
    toast({ title: "Memo copied as Markdown" });
    setTimeout(() => setCopied(false), 2000);
  };

  const exportTxt = () => {
    if (!memo) return;
    const blob = new Blob([toMarkdown()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memo-${memo.company_name.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!memo || !memoRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast({ title: "Please allow popups to export PDF", variant: "destructive" }); return; }
    const html = buildMemoHTML(memo, citations, reviewState, false);
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    printWindow.location.href = blobUrl;
    printWindow.onload = () => { printWindow.print(); printWindow.onafterprint = () => URL.revokeObjectURL(blobUrl); };
  };

  const exportDiligencePack = () => {
    if (!memo) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast({ title: "Please allow popups to export", variant: "destructive" }); return; }
    const html = buildMemoHTML(memo, citations, reviewState, true);
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    printWindow.location.href = blobUrl;
    printWindow.onload = () => { printWindow.print(); printWindow.onafterprint = () => URL.revokeObjectURL(blobUrl); };
  };

  if (!memo) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary/50" />
        <h3 className="text-sm font-semibold text-foreground mb-1">AI Investment Memo</h3>
        <p className="text-xs text-muted-foreground mb-4">Generate a comprehensive investment memo for {companyName} with machine-readable citations.</p>
        {error && <p className="text-xs text-destructive mb-3">{error}</p>}
        <button onClick={generate} disabled={isLoading} className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {isLoading ? "Generating..." : "Generate Memo"}
        </button>
      </div>
    );
  }

  const nextStates = REVIEW_STATES.filter(s => canTransition(reviewState, s.key));

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Investment Memo — {memo.company_name}</h3>
          <ReviewStateBadge state={reviewState} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground">{memo.date}</span>
          <button onClick={() => setShowCitations(!showCitations)} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <ShieldCheck className="h-3 w-3" /> {citations.length} Citations
          </button>
          <button onClick={copyMarkdown} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />} Copy MD
          </button>
          <button onClick={exportTxt} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Download className="h-3 w-3" /> Export
          </button>
          <button onClick={exportPDF} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-primary hover:text-foreground hover:bg-primary/10 transition-colors font-medium">
            <Printer className="h-3 w-3" /> PDF
          </button>
          <button onClick={exportDiligencePack} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-success hover:text-foreground hover:bg-success/10 transition-colors font-medium">
            <Package className="h-3 w-3" /> Diligence Pack
          </button>
          <button onClick={generate} disabled={isLoading} className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Regenerate
          </button>
        </div>
      </div>

      {/* Low-confidence warnings */}
      {lowConfidenceMetrics.length > 0 && (
        <div className="px-4 py-2 bg-warning/5 border-b border-warning/20 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-semibold text-warning">Low-Confidence Data Detected</p>
            <p className="text-[10px] text-warning/80 mt-0.5">
              {lowConfidenceMetrics.slice(0, 5).join(" · ")}{lowConfidenceMetrics.length > 5 ? ` (+${lowConfidenceMetrics.length - 5} more)` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Citation panel */}
      {showCitations && (
        <div className="px-4 py-3 border-b border-border bg-muted/20 max-h-48 overflow-y-auto">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Citation Appendix</h4>
          <div className="space-y-1">
            {citations.map(c => {
              const { text, className } = confidenceLabel(c.confidence);
              const isUrl = typeof c.value === "string" && (c.value as string).startsWith("http");
              return (
                <div key={c.id} className="flex items-center gap-2 text-[10px]">
                  <span className="font-mono text-primary w-12 shrink-0">{c.id}</span>
                  <span className="text-foreground flex-1">
                    {c.metric}: <strong>{c.formattedValue}</strong>
                    {isUrl && (
                      <a href={c.value as string} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary underline text-[9px]">↗</a>
                    )}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded ${className} text-[9px] font-medium`}>{text}</span>
                  <span className="text-muted-foreground">{c.verifiedAt?.split("T")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Memo content */}
      <div ref={memoRef} className="p-6 space-y-6 max-h-[700px] overflow-y-auto">
        {SECTIONS.map(({ key, label, icon }) => (
          <div key={key} className={key === "executive_summary" ? "bg-primary/5 border-l-2 border-primary rounded-r-md p-4 -ml-2" : ""}>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{icon} {label}</h4>
            <div className="text-sm text-foreground leading-relaxed prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{memo[key]}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/10 text-center">
        <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
          For informational purposes only — not investment advice. Conduct independent due diligence before acting on any analysis.
        </p>
      </div>

      {/* Review workflow */}
      <div className="px-4 py-3 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {REVIEW_STATES.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${reviewState === s.key ? "bg-primary" : REVIEW_STATES.findIndex(rs => rs.key === reviewState) > i ? "bg-success" : "bg-muted-foreground/30"}`} />
                <span className={`text-[10px] ${reviewState === s.key ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
                {i < REVIEW_STATES.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/30" />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!showReview && nextStates.length > 0 && (
              <button onClick={() => setShowReview(true)} className="inline-flex items-center gap-1 h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                <ShieldCheck className="h-3 w-3" /> Advance Review
              </button>
            )}
          </div>
        </div>
        {showReview && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            <textarea
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="Review comment (optional)..."
              className="w-full h-16 px-3 py-2 rounded-md bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <div className="flex items-center gap-2">
              {nextStates.map(s => (
                <button
                  key={s.key}
                  onClick={() => transitionReview(s.key)}
                  className={`inline-flex items-center gap-1 h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                    s.key === "draft"
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {s.key === "draft" ? "Reject to Draft" : `Move to ${s.label}`}
                </button>
              ))}
              <button onClick={() => setShowReview(false)} className="h-7 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline action */}
      <div className="px-4 py-3 border-t border-border bg-muted/10 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{addedToPipeline ? "Added to pipeline ✓" : "Ready to track this deal?"}</p>
        <div className="flex items-center gap-2">
          {addedToPipeline ? (
            <button onClick={() => navigate("/deals")} className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors">
              View Pipeline →
            </button>
          ) : (
            <button onClick={() => addToPipeline.mutate()} disabled={addToPipeline.isPending} className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {addToPipeline.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add to Pipeline
            </button>
          )}
        </div>
      </div>
      <UpgradePrompt open={showUpgrade} onClose={dismissUpgrade} blockedAction={blockedAction} />
    </div>
  );
};

export default InvestmentMemo;
