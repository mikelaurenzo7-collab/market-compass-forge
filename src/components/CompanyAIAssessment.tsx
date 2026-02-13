import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlphaSignals } from "@/hooks/useAlphaSignals";
import { useMacroIndicators } from "@/hooks/useMacroIndicators";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CompanyAIAssessmentProps {
  sector?: string | null;
  stage?: string | null;
  growthRate?: number | null; // as decimal e.g. 0.25
  revenue?: number | null;
  ebitda?: number | null;
  companyName: string;
}

const CompanyAIAssessment = ({ sector, stage, growthRate, revenue, ebitda, companyName }: CompanyAIAssessmentProps) => {
  const { data: alphaSignals, isLoading: signalsLoading } = useAlphaSignals();
  const { data: macroIndicators, isLoading: macroLoading } = useMacroIndicators();

  const assessment = useMemo(() => {
    if (!alphaSignals?.length || !macroIndicators?.length) return null;

    const sectorSignal = alphaSignals.find(s =>
      sector?.toLowerCase().includes(s.sector.toLowerCase()) ||
      s.sector.toLowerCase().includes(sector?.toLowerCase() ?? "")
    );

    const treasury = macroIndicators.find(m => m.series_id === "DGS10");
    const fedFunds = macroIndicators.find(m => m.series_id === "FEDFUNDS");
    const cpi = macroIndicators.find(m => m.series_id === "CPIAUCSL");

    if (!sectorSignal) return null;

    const growthPct = growthRate ? Math.round(growthRate * 100) : null;
    const direction = sectorSignal.direction;
    const magnitude = Math.abs(sectorSignal.magnitude_pct);

    // Build assessment summary
    const macroContext = treasury
      ? `10Y at ${treasury.value.toFixed(2)}%${fedFunds ? `, Fed Funds at ${fedFunds.value.toFixed(2)}%` : ""}${cpi ? `, CPI ${cpi.value.toFixed(1)}` : ""}`
      : "current macro conditions";

    const sectorContext = `public comps in ${sectorSignal.sector} ${direction === "bullish" ? "rising" : direction === "bearish" ? "declining" : "stable"} ${magnitude.toFixed(1)}%`;

    const companyContext = growthPct
      ? `${companyName}'s ${growthPct}% growth rate`
      : `${companyName}'s current trajectory`;

    const outlook = direction === "bullish"
      ? "we project valuation stability with upside bias"
      : direction === "bearish"
      ? "we see potential headwinds requiring defensive positioning"
      : "we project range-bound valuation with balanced risk/reward";

    const summary = `Based on macro conditions (${macroContext}), ${sectorContext}, and ${companyContext}, ${outlook}.`;

    return {
      summary,
      signal: sectorSignal,
      treasuryValue: treasury?.value,
    };
  }, [alphaSignals, macroIndicators, sector, growthRate, companyName]);

  if (signalsLoading || macroLoading) return null;
  if (!assessment) return null;

  const { signal } = assessment;
  const DirectionIcon = signal.direction === "bullish" ? TrendingUp : signal.direction === "bearish" ? TrendingDown : Minus;
  const directionColor = signal.direction === "bullish" ? "text-primary" : signal.direction === "bearish" ? "text-destructive" : "text-muted-foreground";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          AI Health Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{assessment.summary}</p>

        <div className="flex items-center gap-3 p-2.5 rounded-md bg-secondary/30 border border-border/50">
          <DirectionIcon className={`h-5 w-5 ${directionColor}`} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">
              {signal.sector} — {signal.direction.charAt(0).toUpperCase() + signal.direction.slice(1)}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {signal.magnitude_pct > 0 ? "+" : ""}{signal.magnitude_pct.toFixed(1)}% projected shift
            </p>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
            signal.confidence === "high" ? "bg-primary/10 text-primary" :
            signal.confidence === "medium" ? "bg-accent text-accent-foreground" :
            "bg-muted text-muted-foreground"
          }`}>
            {signal.confidence}
          </span>
        </div>

        <p className="text-[9px] text-muted-foreground">
          AI-generated · {new Date(signal.generated_at).toLocaleDateString()} · {signal.model_used || "Gemini Flash"}
        </p>
      </CardContent>
    </Card>
  );
};

export default CompanyAIAssessment;
