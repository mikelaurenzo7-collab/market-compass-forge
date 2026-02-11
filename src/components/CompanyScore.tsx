import { CompanyScoreResult } from "@/hooks/useCompanyScore";
import { TrendingUp } from "lucide-react";

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const formatMultiple = (v: number | null) => v !== null ? `${v.toFixed(1)}x` : "—";
const formatPct = (v: number | null) => v !== null ? `${Math.round(v * 100)}%` : "—";
const formatR40 = (v: number | null) => v !== null ? Math.round(v).toString() : "—";

const CompanyScore = ({ score }: { score: CompanyScoreResult | null }) => {
  if (!score) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Investment Score</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold font-mono ${score.color}`}>{score.grade}</span>
          <span className="text-xs text-muted-foreground font-mono">{score.overall}/100</span>
        </div>
      </div>

      {/* Key valuation metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3 p-2 rounded-md bg-muted/30">
        <div>
          <p className="text-[10px] text-muted-foreground">EV/Revenue</p>
          <p className="text-xs font-mono font-medium text-foreground">{formatMultiple(score.impliedMultiple)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">EV/EBITDA</p>
          <p className="text-xs font-mono font-medium text-foreground">{formatMultiple(score.evEbitda)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Fwd Multiple (2Y)</p>
          <p className="text-xs font-mono font-medium text-foreground">{formatMultiple(score.forwardMultiple)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Rule of 40</p>
          <p className={`text-xs font-mono font-medium ${score.ruleOf40 !== null && score.ruleOf40 >= 40 ? 'text-success' : score.ruleOf40 !== null && score.ruleOf40 < 20 ? 'text-destructive' : 'text-foreground'}`}>
            {formatR40(score.ruleOf40)}
          </p>
        </div>
      </div>

      {/* Sector benchmarks */}
      {(score.sectorMedianEvRevenue || score.sectorMedianEvEbitda) && (
        <div className="grid grid-cols-2 gap-2 mb-3 p-2 rounded-md border border-border/50 bg-secondary/20">
          <div>
            <p className="text-[10px] text-muted-foreground">Sector Med EV/Rev</p>
            <p className="text-xs font-mono font-medium text-foreground">{formatMultiple(score.sectorMedianEvRevenue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Sector Med EV/EBITDA</p>
            <p className="text-xs font-mono font-medium text-foreground">{formatMultiple(score.sectorMedianEvEbitda)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Revenue CAGR</p>
            <p className="text-xs font-mono font-medium text-foreground">{formatPct(score.revenueCAGR)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">vs Sector</p>
            <p className={`text-xs font-mono font-medium ${score.impliedMultiple && score.sectorMedianEvRevenue && score.impliedMultiple < score.sectorMedianEvRevenue ? 'text-success' : 'text-foreground'}`}>
              {score.impliedMultiple && score.sectorMedianEvRevenue
                ? `${((score.impliedMultiple / score.sectorMedianEvRevenue) * 100).toFixed(0)}% of median`
                : "—"}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <ScoreBar label="ARR / Revenue Scale" value={score.arrScore} />
        <ScoreBar label="Valuation (Sector-Adj)" value={score.valuationScore} />
        <ScoreBar label="Growth Trajectory" value={score.growthScore} />
        <ScoreBar label="Sector Momentum" value={score.sectorMomentum} />
        <ScoreBar label="Operational Efficiency" value={score.efficiencyScore} />
        <ScoreBar label="Capital Efficiency" value={score.capitalEfficiency} />
      </div>
      {score.insights.length > 0 && (
        <div className="mt-3 space-y-1">
          {score.insights.map((insight, i) => (
            <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">
              • {insight}
            </p>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/60 mt-2 border-t border-border pt-2">
        Weighted: Scale 18% · Valuation 22% · Growth 18% · Sector 12% · Efficiency 15% · Capital 15%
      </p>
    </div>
  );
};

export default CompanyScore;
