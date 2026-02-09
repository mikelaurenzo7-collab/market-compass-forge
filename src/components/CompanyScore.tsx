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
      <div className="space-y-2.5">
        <ScoreBar label="ARR Scale" value={score.arrScore} />
        <ScoreBar label="Valuation Efficiency" value={score.valuationScore} />
        <ScoreBar label="Sector Momentum" value={score.sectorMomentum} />
        <ScoreBar label="Operational Efficiency" value={score.efficiencyScore} />
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">
        Algorithmic score based on ARR scale, valuation multiples, sector momentum, and operational efficiency.
      </p>
    </div>
  );
};

export default CompanyScore;
