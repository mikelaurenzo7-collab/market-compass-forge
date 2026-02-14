import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Download, Sparkles, Copy, Check, Plus, Printer } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLogger";
import { useAuth } from "@/hooks/useAuth";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import UpgradePrompt from "@/components/UpgradePrompt";

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

const InvestmentMemo = ({ companyId, companyName }: { companyId: string; companyName: string }) => {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [addedToPipeline, setAddedToPipeline] = useState(false);
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
      logActivity({
        userId: user!.id,
        action: "added to pipeline after memo",
        entityType: "deal",
        entityId: companyId,
        entityName: companyName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      setAddedToPipeline(true);
      toast({ title: "Added to pipeline" });
    },
  });

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

      const { memo: memoData } = await resp.json();
      setMemo(memoData);

      if (user) {
        logActivity({
          userId: user.id,
          action: "generated investment memo for",
          entityType: "company",
          entityId: companyId,
          entityName: companyName,
        });
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
    ).join("\n\n---\n\n")}\n\n---\n\n_Disclaimer: This memo is for informational purposes only and does not constitute investment advice. Always conduct independent due diligence._`;
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
    if (!printWindow) {
      toast({ title: "Please allow popups to export PDF", variant: "destructive" });
      return;
    }

    const sectionColors: Record<string, string> = {
      executive_summary: "#0ea5e9",
      thesis: "#8b5cf6",
      market: "#06b6d4",
      traction: "#10b981",
      management: "#f59e0b",
      competitive_landscape: "#ef4444",
      risks: "#f97316",
      valuation: "#6366f1",
      terms_structure: "#64748b",
      recommendation: "#22c55e",
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Investment Memo — ${memo.company_name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Georgia', 'Times New Roman', serif; 
            color: #1a1a1a; 
            line-height: 1.65; 
            padding: 48px 56px; 
            max-width: 820px; 
            margin: 0 auto; 
          }
          .cover { 
            text-align: center;
            padding: 40px 0 32px;
            border-bottom: 4px solid #0ea5e9;
            margin-bottom: 32px;
          }
          .cover .brand { 
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: #0ea5e9;
            margin-bottom: 16px;
          }
          .cover h1 { 
            font-size: 32px; 
            font-weight: 700; 
            color: #0c4a6e; 
            margin-bottom: 6px; 
          }
          .cover .date { 
            font-size: 13px; 
            color: #64748b; 
            font-family: 'Courier New', monospace;
          }
          .cover .badges {
            margin-top: 12px;
          }
          .cover .badge {
            display: inline-block;
            background: #0ea5e9;
            color: white;
            padding: 3px 12px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 4px;
          }
          .cover .badge.draft {
            background: #94a3b8;
          }
          .toc {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px 24px;
            margin-bottom: 28px;
          }
          .toc h3 {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #64748b;
            margin-bottom: 10px;
          }
          .toc ol {
            padding-left: 18px;
            columns: 2;
            column-gap: 24px;
          }
          .toc li {
            font-size: 12px;
            color: #334155;
            padding: 2px 0;
            break-inside: avoid;
          }
          .section { 
            margin-bottom: 24px;
            page-break-inside: avoid;
          }
          .section h2 { 
            font-size: 13px; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 1.2px; 
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .section p, .section li { 
            font-size: 13px; 
            color: #334155; 
            margin-bottom: 8px; 
          }
          .section ul { padding-left: 20px; }
          .section strong { color: #1a1a1a; }
          .executive-summary {
            background: linear-gradient(135deg, #f0f9ff, #eff6ff);
            border-left: 4px solid #0ea5e9;
            border-radius: 0 8px 8px 0;
            padding: 16px 20px;
            margin-bottom: 24px;
          }
          .executive-summary h2 {
            border-bottom: none;
            padding-bottom: 0;
            color: #0c4a6e;
          }
          .executive-summary p {
            font-size: 14px;
            color: #0c4a6e;
            line-height: 1.7;
            font-weight: 500;
          }
          .footer { 
            margin-top: 36px; 
            padding-top: 16px; 
            border-top: 2px solid #e2e8f0; 
            font-size: 10px; 
            color: #94a3b8; 
            text-align: center;
            line-height: 1.6;
          }
          @media print {
            body { padding: 36px; }
            @page { margin: 1.5cm; size: A4; }
            .section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="cover">
          <div class="brand">Grapevine Intelligence</div>
          <h1>${memo.company_name}</h1>
          <div class="date">${memo.date}</div>
          <div class="badges">
            <span class="badge">Confidential</span>
            <span class="badge draft">Investment Memo</span>
          </div>
        </div>

        <div class="toc">
          <h3>Table of Contents</h3>
          <ol>
            ${SECTIONS.map(({ label }) => `<li>${label}</li>`).join("")}
          </ol>
        </div>

        ${SECTIONS.map(({ key, label, icon }) => {
          const color = sectionColors[key] || "#0ea5e9";
          if (key === "executive_summary") {
            return `
              <div class="executive-summary">
                <h2>${icon} ${label}</h2>
                <div>${memo[key].replace(/\n/g, "<br/>")}</div>
              </div>
            `;
          }
          return `
            <div class="section">
              <h2 style="color: ${color}; border-bottom-color: ${color}30;">${icon} ${label}</h2>
              <div>${memo[key].replace(/\n/g, "<br/>")}</div>
            </div>
          `;
        }).join("")}

        <div class="footer">
          Generated by Grapevine Intelligence Platform · ${memo.date}<br/>
          <strong>DISCLAIMER:</strong> This memo is for informational purposes only and does not constitute investment advice.
          All data and analysis are provided "as-is" without warranty. Always conduct independent due diligence before making investment decisions.
          <br/><br/>
          <em>Proprietary & Confidential — Do not distribute without authorization.</em>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    printWindow.location.href = blobUrl;
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => URL.revokeObjectURL(blobUrl);
    };
  };

  if (!memo) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-3 text-primary/50" />
        <h3 className="text-sm font-semibold text-foreground mb-1">AI Investment Memo</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Generate a comprehensive investment memo for {companyName} using AI analysis.
        </p>
        {error && <p className="text-xs text-destructive mb-3">{error}</p>}
        <button
          onClick={generate}
          disabled={isLoading}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {isLoading ? "Generating..." : "Generate Memo"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Investment Memo — {memo.company_name}</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-muted-foreground">{memo.date}</span>
          <button
            onClick={copyMarkdown}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />} Copy MD
          </button>
          <button
            onClick={exportTxt}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="h-3 w-3" /> Export
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-primary hover:text-foreground hover:bg-primary/10 transition-colors font-medium"
          >
            <Printer className="h-3 w-3" /> PDF
          </button>
          <button
            onClick={generate}
            disabled={isLoading}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Regenerate
          </button>
        </div>
      </div>

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

      <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {addedToPipeline ? "Added to pipeline ✓" : "Ready to track this deal?"}
        </p>
        <div className="flex items-center gap-2">
          {addedToPipeline ? (
            <button
              onClick={() => navigate("/deals")}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              View Pipeline →
            </button>
          ) : (
            <button
              onClick={() => addToPipeline.mutate()}
              disabled={addToPipeline.isPending}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addToPipeline.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Add to Pipeline
            </button>
          )}
        </div>
      </div>
      <UpgradePrompt open={showUpgrade} onClose={dismissUpgrade} blockedAction={blockedAction} />
    </div>
  );
};

export default InvestmentMemo;
