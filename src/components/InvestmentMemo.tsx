import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Download, Sparkles, Copy, Check, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "@/hooks/use-toast";
import { logActivity } from "@/lib/activityLogger";
import { useAuth } from "@/hooks/useAuth";

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

      {/* Add to Pipeline CTA */}
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
    </div>
  );
};

export default InvestmentMemo;
