import { useMemo } from "react";
import { motion } from "framer-motion";
import { Grape, AlertTriangle, CheckCircle, TrendingUp, Users, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GrapevineScoreProps {
  /** deal_tasks for current deal */
  dealTasks: any[];
  /** deal_votes for current deal */
  votes: any[];
  /** company_documents (may contain red_flags) */
  documents: any[];
  /** Latest financials row */
  latestFinancial: any | null;
  /** Latest funding round (for valuation) */
  latestFunding: any | null;
  /** Sector multiples from peer data (optional) */
  sectorMedianEvRevenue?: number | null;
}

interface ScoreBreakdown {
  diligence: number;
  conviction: number;
  valuationUpside: number;
  riskPenalty: number;
  riskFlagCount: number;
  overall: number;
  grade: string;
  color: string;
}

const RISK_PENALTY_PER_FLAG = 5; // drop 5 pts per risk flag

function computeGrapevineScore(props: GrapevineScoreProps): ScoreBreakdown {
  const { dealTasks, votes, documents, latestFinancial, latestFunding, sectorMedianEvRevenue } = props;

  // ── 1. Diligence Completion (0-100) ──
  const allTasks = dealTasks ?? [];
  const completed = allTasks.filter((t: any) => t.is_completed).length;
  const diligence = allTasks.length > 0 ? Math.round((completed / allTasks.length) * 100) : 0;

  // ── 2. Conviction Score (0-100) ──
  const allVotes = votes ?? [];
  const yesVotes = allVotes.filter((v: any) => v.vote === "yes").length;
  const totalVotes = allVotes.length;
  // Also factor in conviction_score from voters
  const avgConviction = allVotes.length > 0
    ? allVotes.reduce((s: number, v: any) => s + (Number(v.conviction_score) || 50), 0) / allVotes.length
    : 0;
  // Blend vote ratio with average conviction
  const voteRatio = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
  const conviction = totalVotes > 0 ? Math.round(voteRatio * 0.5 + avgConviction * 0.5) : 0;

  // ── 3. Valuation Upside (0-100) ──
  let valuationUpside = 50; // default neutral
  const revenue = latestFinancial?.revenue ?? latestFinancial?.arr ?? 0;
  const valuation = latestFunding?.valuation_post ?? 0;

  if (revenue > 0 && valuation > 0) {
    const impliedMultiple = valuation / revenue;
    const sectorMedian = sectorMedianEvRevenue ?? impliedMultiple; // fallback to self

    if (sectorMedian > 0) {
      // If company trades below sector median, that's upside
      const discount = ((sectorMedian - impliedMultiple) / sectorMedian) * 100;
      valuationUpside = Math.min(100, Math.max(0, Math.round(50 + discount)));
    }
  }

  // ── 4. Risk Flag Penalty ──
  const docs = documents ?? [];
  const riskFlagCount = docs.reduce((count: number, doc: any) => {
    const flags = doc.red_flags;
    if (Array.isArray(flags)) return count + flags.length;
    return count;
  }, 0);
  const riskPenalty = riskFlagCount * RISK_PENALTY_PER_FLAG;

  // ── Weighted Average ──
  const raw = diligence * 0.3 + conviction * 0.3 + valuationUpside * 0.4;
  const overall = Math.max(0, Math.min(100, Math.round(raw - riskPenalty)));

  const grade = overall >= 85 ? "A+" : overall >= 75 ? "A" : overall >= 65 ? "B+" : overall >= 55 ? "B" : overall >= 45 ? "C" : overall >= 30 ? "D" : "F";
  const color = overall >= 75 ? "text-success" : overall >= 55 ? "text-primary" : overall >= 35 ? "text-warning" : "text-destructive";

  return { diligence, conviction, valuationUpside, riskPenalty, riskFlagCount, overall, grade, color };
}

const GrapevineScore = (props: GrapevineScoreProps) => {
  const score = useMemo(() => computeGrapevineScore(props), [props.dealTasks, props.votes, props.documents, props.latestFinancial, props.latestFunding, props.sectorMedianEvRevenue]);

  const size = 52;
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score.overall / 100) * circumference;
  const ringColor = score.overall >= 75 ? "hsl(var(--success))" : score.overall >= 55 ? "hsl(var(--primary))" : score.overall >= 35 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/80 cursor-help hover:border-primary/40 transition-colors"
          >
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={3} opacity={0.3} />
                <motion.circle
                  cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringColor} strokeWidth={3}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference - progress }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-sm font-black font-mono ${score.color}`}>{score.overall}</span>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1">
                <Grape className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Grapevine</span>
              </div>
              <span className={`text-xs font-bold font-mono ${score.color}`}>{score.grade}</span>
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="w-72 p-0">
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Grape className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Grapevine Score Breakdown</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Proprietary deal quality score combining diligence, conviction, and valuation signals.
            </p>
          </div>
          <div className="p-3 space-y-2">
            {/* Diligence */}
            <ScoreRow icon={<CheckCircle className="h-3 w-3 text-chart-4" />} label="Diligence Completion" value={score.diligence} weight="30%" />
            {/* Conviction */}
            <ScoreRow icon={<Users className="h-3 w-3 text-primary" />} label="IC Conviction" value={score.conviction} weight="30%" />
            {/* Valuation Upside */}
            <ScoreRow icon={<TrendingUp className="h-3 w-3 text-success" />} label="Valuation Upside" value={score.valuationUpside} weight="40%" />

            {score.riskFlagCount > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  <span className="text-[10px] text-destructive font-medium">
                    {score.riskFlagCount} Risk Flag{score.riskFlagCount > 1 ? "s" : ""}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-destructive">-{score.riskPenalty}pts</span>
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[10px] font-semibold text-foreground">Overall Score</span>
              <span className={`text-sm font-black font-mono ${score.color}`}>{score.overall}/100 ({score.grade})</span>
            </div>
          </div>
          <div className="px-3 pb-2">
            <p className="text-[9px] text-muted-foreground/60">
              Weighted: Diligence 30% · Conviction 30% · Valuation 40%. Risk flags penalize {RISK_PENALTY_PER_FLAG}pts each.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const ScoreRow = ({ icon, label, value, weight }: { icon: React.ReactNode; label: string; value: number; weight: string }) => {
  const barColor = value >= 70 ? "bg-success" : value >= 40 ? "bg-primary" : "bg-destructive";
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <span className="text-[9px] text-muted-foreground/60">({weight})</span>
        </div>
        <span className="text-[10px] font-mono text-foreground">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
    </div>
  );
};

export default GrapevineScore;
