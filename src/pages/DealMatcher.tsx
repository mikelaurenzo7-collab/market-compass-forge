import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Target, AlertTriangle, TrendingUp, ArrowRight, RefreshCw, Zap, Shield, Globe, Building2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/hooks/useData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type DealMatch = {
  type: "distressed" | "global" | "deal_comp";
  id: string;
  name: string;
  matchScore: number;
  matchReason: string;
  valuationInsight: string;
  riskFlag: string;
  sector: string;
  actionRecommendation: "investigate" | "fast_track" | "monitor" | "pass";
};

const actionColors: Record<string, string> = {
  fast_track: "bg-primary/15 text-primary border-primary/30",
  investigate: "bg-accent text-accent-foreground border-border",
  monitor: "bg-muted text-muted-foreground border-border",
  pass: "bg-destructive/10 text-destructive border-destructive/20",
};

const actionLabels: Record<string, string> = {
  fast_track: "Fast Track",
  investigate: "Investigate",
  monitor: "Monitor",
  pass: "Pass",
};

const typeIcons: Record<string, typeof Globe> = {
  distressed: AlertTriangle,
  global: Globe,
  deal_comp: Building2,
};

const typeLabels: Record<string, string> = {
  distressed: "Distressed",
  global: "Global Opp",
  deal_comp: "Deal Comp",
};

const ScoreRing = ({ score }: { score: number }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "hsl(var(--primary))" : score >= 60 ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))";

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
        <circle cx="22" cy="22" r={radius} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold text-foreground">{score}</span>
    </div>
  );
};

const DealMatcher = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<DealMatch[]>([]);
  const [meta, setMeta] = useState<{ pipelineCount?: number; sectorsAnalyzed?: string[] }>({});

  const runMatcher = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in to use deal matching");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deal-matcher`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      return resp.json();
    },
    onSuccess: (data) => {
      setMatches(data.matches ?? []);
      setMeta({ pipelineCount: data.pipelineCount, sectorsAnalyzed: data.sectorsAnalyzed });
      if (data.matches?.length > 0) {
        toast.success(`Found ${data.matches.length} deal matches`);
      } else {
        toast.info(data.message || "No matches found. Expand your pipeline to get better results.");
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const hasResults = matches.length > 0;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Deal Matcher
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasResults
              ? `${matches.length} matches across ${meta.sectorsAnalyzed?.length ?? 0} sectors · ${meta.pipelineCount ?? 0} pipeline companies analyzed`
              : "Smart matching across distressed assets, global opportunities, and comparable deals"}
          </p>
        </div>
        <Button
          onClick={() => runMatcher.mutate()}
          disabled={runMatcher.isPending}
          className="gap-2"
        >
          {runMatcher.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasResults ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {runMatcher.isPending ? "Analyzing…" : hasResults ? "Re-scan" : "Run AI Matcher"}
        </Button>
      </div>

      {/* Empty state */}
      {!hasResults && !runMatcher.isPending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-dashed border-border bg-card p-12 text-center space-y-4"
        >
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Find Your Next Deal</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              The AI analyzes your pipeline companies — sectors, stages, geographies — and matches them with distressed assets, global opportunities, and comparable transactions.
            </p>
          </div>
          <Button onClick={() => runMatcher.mutate()} className="gap-2">
            <Zap className="h-4 w-4" />
            Run AI Matcher
          </Button>
        </motion.div>
      )}

      {/* Loading */}
      {runMatcher.isPending && (
        <div className="rounded-lg border border-border bg-card p-12 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Scanning distressed assets, global opportunities, and deal comps…</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-3">
          {matches.map((m, i) => {
            const TypeIcon = typeIcons[m.type] ?? Building2;
            return (
              <motion.div
                key={`${m.type}-${m.id}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => {
                  if (m.type === "distressed") navigate(`/distressed`);
                  else if (m.type === "global") navigate(`/global`);
                  else navigate(`/deals`);
                }}
              >
                <div className="flex items-start gap-4">
                  <ScoreRing score={m.matchScore} />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{m.name}</span>
                      <Badge variant="outline" className="text-[9px] gap-1 px-1.5 py-0">
                        <TypeIcon className="h-2.5 w-2.5" />
                        {typeLabels[m.type]}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{m.sector}</Badge>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${actionColors[m.actionRecommendation]}`}>
                        {actionLabels[m.actionRecommendation]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.matchReason}</p>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="flex items-center gap-1 text-primary">
                        <TrendingUp className="h-3 w-3" />
                        {m.valuationInsight}
                      </span>
                      <span className="flex items-center gap-1 text-destructive/80">
                        <Shield className="h-3 w-3" />
                        {m.riskFlag}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealMatcher;
