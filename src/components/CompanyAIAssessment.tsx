import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlphaSignals } from "@/hooks/useAlphaSignals";
import { useMacroIndicators } from "@/hooks/useMacroIndicators";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, TrendingDown, Minus, Loader2, Sparkles, ShieldAlert, Target, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CompanyAIAssessmentProps {
  sector?: string | null;
  stage?: string | null;
  growthRate?: number | null;
  revenue?: number | null;
  ebitda?: number | null;
  companyName: string;
  companyId?: string;
}

interface HealthFactor {
  name: string;
  score: number;
  insight: string;
}

interface HealthScore {
  overallScore: number;
  scoreLabel: string;
  summary: string;
  factors: HealthFactor[];
  opportunities: string[];
  risks: string[];
  macroImpact: string;
  sectorOutlook: string;
}

const ScoreRing = ({ score, size = 80 }: { score: number; size?: number }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 80 ? "hsl(var(--primary))" : score >= 60 ? "hsl(var(--warning))" : score >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={4} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold font-mono text-foreground">{score}</span>
      </div>
    </div>
  );
};

const FactorBar = ({ factor }: { factor: HealthFactor }) => {
  const color = factor.score >= 75 ? "bg-primary" : factor.score >= 50 ? "bg-warning" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-foreground">{factor.name}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{factor.score}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${factor.score}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">{factor.insight}</p>
    </div>
  );
};

const CompanyAIAssessment = ({ sector, stage, growthRate, revenue, ebitda, companyName, companyId }: CompanyAIAssessmentProps) => {
  const { data: alphaSignals } = useAlphaSignals();
  const { data: macroIndicators } = useMacroIndicators();
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const runAssessment = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("compute-health-score", {
        body: { companyId },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setHealthScore(data);
      setExpanded(true);
    } catch (e: any) {
      setError(e.message || "Assessment failed");
    } finally {
      setLoading(false);
    }
  };

  // Fallback: show basic signal if no AI assessment yet
  const sectorSignal = alphaSignals?.find(s =>
    sector?.toLowerCase().includes(s.sector.toLowerCase()) ||
    s.sector.toLowerCase().includes(sector?.toLowerCase() ?? "")
  );

  const treasury = macroIndicators?.find(m => m.series_id === "DGS10");

  const DirectionIcon = sectorSignal?.direction === "bullish" ? TrendingUp : sectorSignal?.direction === "bearish" ? TrendingDown : Minus;
  const directionColor = sectorSignal?.direction === "bullish" ? "text-primary" : sectorSignal?.direction === "bearish" ? "text-destructive" : "text-muted-foreground";

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Health Assessment
          </CardTitle>
          {!healthScore && !loading && (
            <button
              onClick={runAssessment}
              disabled={!companyId}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" /> Run Deep Analysis
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-6 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Analyzing {companyName}...</span>
          </div>
        )}

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md p-3">
            {error}
          </div>
        )}

        {healthScore && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Score header */}
            <div className="flex items-center gap-4">
              <ScoreRing score={healthScore.overallScore} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    healthScore.overallScore >= 80 ? "bg-primary/10 text-primary" :
                    healthScore.overallScore >= 60 ? "bg-warning/10 text-warning" :
                    healthScore.overallScore >= 40 ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    {healthScore.scoreLabel}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1.5">{healthScore.summary}</p>
              </div>
            </div>

            {/* Expand/collapse */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {expanded ? "Show less" : "Show details"}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Factor bars */}
                  <div className="space-y-3">
                    {healthScore.factors.map((f) => (
                      <FactorBar key={f.name} factor={f} />
                    ))}
                  </div>

                  {/* Opportunities & Risks */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-md bg-primary/5 border border-primary/10 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                        <Target className="h-3 w-3" /> Opportunities
                      </div>
                      {healthScore.opportunities.map((o, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">• {o}</p>
                      ))}
                    </div>
                    <div className="rounded-md bg-destructive/5 border border-destructive/10 p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                        <ShieldAlert className="h-3 w-3" /> Risks
                      </div>
                      {healthScore.risks.map((r, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">• {r}</p>
                      ))}
                    </div>
                  </div>

                  {/* Macro & Sector */}
                  <div className="space-y-2 pt-1">
                    <div className="rounded-md bg-secondary/30 p-2.5">
                      <p className="text-[10px] font-medium text-foreground mb-0.5">Macro Impact</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{healthScore.macroImpact}</p>
                    </div>
                    <div className="rounded-md bg-secondary/30 p-2.5">
                      <p className="text-[10px] font-medium text-foreground mb-0.5">Sector Outlook</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{healthScore.sectorOutlook}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Baseline signal (always shown if available) */}
        {!healthScore && !loading && sectorSignal && (
          <>
            <div className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/30 border border-border/50">
              <DirectionIcon className={`h-5 w-5 ${directionColor}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {sectorSignal.sector} — {sectorSignal.direction.charAt(0).toUpperCase() + sectorSignal.direction.slice(1)}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {sectorSignal.magnitude_pct > 0 ? "+" : ""}{sectorSignal.magnitude_pct.toFixed(1)}% projected shift
                </p>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                sectorSignal.confidence === "high" ? "bg-primary/10 text-primary" :
                sectorSignal.confidence === "medium" ? "bg-accent text-accent-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {sectorSignal.confidence}
              </span>
            </div>
            {treasury && (
              <p className="text-[9px] text-muted-foreground">
                10Y Treasury: {treasury.value.toFixed(2)}% · Click "Run Deep Analysis" for full AI assessment
              </p>
            )}
          </>
        )}

        {!healthScore && !loading && !sectorSignal && (
          <p className="text-xs text-muted-foreground">No sector signal available. Run deep analysis for AI-powered assessment.</p>
        )}

        {healthScore && (
          <p className="text-[9px] text-muted-foreground">
            AI-generated · {new Date().toLocaleDateString()} · Gemini Flash
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyAIAssessment;
