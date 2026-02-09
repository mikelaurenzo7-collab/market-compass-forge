import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Loader2, Download, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

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

  const generate = async () => {
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
    } catch (e: any) {
      setError(e.message || "Failed to generate memo");
    } finally {
      setIsLoading(false);
    }
  };

  const exportPDF = () => {
    if (!memo) return;
    const content = `
INVESTMENT MEMO: ${memo.company_name}
Date: ${memo.date}
${"=".repeat(60)}

INVESTMENT THESIS
${memo.thesis}

MARKET ANALYSIS
${memo.market}

TRACTION & METRICS
${memo.traction}

KEY RISKS
${memo.risks}

VALUATION
${memo.valuation}

RECOMMENDATION
${memo.recommendation}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memo-${memo.company_name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Investment Memo — {memo.company_name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground">{memo.date}</span>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="h-3 w-3" /> Export
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
      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {SECTIONS.map(({ key, label }) => (
          <div key={key}>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{label}</h4>
            <div className="text-sm text-foreground leading-relaxed prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{memo[key]}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InvestmentMemo;
