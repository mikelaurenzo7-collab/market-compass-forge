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
  thesis: string;
  market: string;
  traction: string;
  risks: string;
  valuation: string;
  recommendation: string;
};

const SECTIONS: { key: keyof Omit<Memo, "company_name" | "date">; label: string }[] = [
  { key: "thesis", label: "Investment Thesis" },
  { key: "market", label: "Market Analysis" },
  { key: "traction", label: "Traction & Metrics" },
  { key: "risks", label: "Key Risks" },
  { key: "valuation", label: "Valuation" },
  { key: "recommendation", label: "Recommendation" },
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
    return `# Investment Memo: ${memo.company_name}\n_${memo.date}_\n\n${SECTIONS.map(
      ({ key, label }) => `## ${label}\n\n${memo[key]}`
    ).join("\n\n---\n\n")}`;
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
            line-height: 1.6; 
            padding: 60px; 
            max-width: 800px; 
            margin: 0 auto; 
          }
          .header { 
            border-bottom: 3px solid #0ea5e9; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
          }
          .header h1 { 
            font-size: 28px; 
            font-weight: 700; 
            color: #0c4a6e; 
            margin-bottom: 4px; 
          }
          .header .date { 
            font-size: 13px; 
            color: #64748b; 
            font-family: 'Courier New', monospace;
          }
          .header .badge {
            display: inline-block;
            background: #0ea5e9;
            color: white;
            padding: 2px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 8px;
          }
          .section { margin-bottom: 28px; }
          .section h2 { 
            font-size: 14px; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            color: #0ea5e9; 
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
          }
          .section p, .section li { 
            font-size: 14px; 
            color: #334155; 
            margin-bottom: 8px; 
          }
          .section ul { padding-left: 20px; }
          .section strong { color: #1a1a1a; }
          .footer { 
            margin-top: 40px; 
            padding-top: 16px; 
            border-top: 1px solid #e2e8f0; 
            font-size: 11px; 
            color: #94a3b8; 
            text-align: center;
          }
          @media print {
            body { padding: 40px; }
            @page { margin: 1.5cm; size: A4; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Investment Memo: ${memo.company_name}</h1>
          <div class="date">${memo.date}</div>
          <div class="badge">Confidential</div>
        </div>
        ${SECTIONS.map(({ key, label }) => `
          <div class="section">
            <h2>${label}</h2>
            <div>${memo[key].replace(/\n/g, "<br/>")}</div>
          </div>
        `).join("")}
        <div class="footer">
          Generated by Laurenzo's Grapevine · ${memo.date}<br/>
          <strong>DISCLAIMER:</strong> This memo is for informational purposes only and does not constitute investment advice.
          All data and analysis are provided "as-is" without warranty. Always conduct independent due diligence before making investment decisions.
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

      <div ref={memoRef} className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {SECTIONS.map(({ key, label }) => (
          <div key={key}>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{label}</h4>
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
