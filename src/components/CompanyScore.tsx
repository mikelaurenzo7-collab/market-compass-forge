import { CompanyScoreResult } from "@/hooks/useCompanyScore";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const AnimatedScoreRing = ({ score, grade, color }: { score: number; grade: string; color: string }) => {
  const size = 72;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const ringColor = score >= 80 ? "hsl(var(--success))" : score >= 60 ? "hsl(var(--primary))" : score >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={4} opacity={0.3} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringColor} strokeWidth={4}
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 6px ${ringColor}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-xl font-bold font-mono ${color}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        >
          {grade}
        </motion.span>
        <span className="text-[9px] text-muted-foreground font-mono">{score}/100</span>
      </div>
    </div>
  );
};

const AnimatedScoreBar = ({ label, value, delay }: { label: string; value: number; delay: number }) => {
  const barColor = value >= 75 ? "from-primary to-primary/60" : value >= 50 ? "from-warning to-warning/60" : "from-destructive to-destructive/60";
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <motion.span
          className="font-mono text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay }}
        >
          {value}
        </motion.span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
};

const formatMultiple = (v: number | null) => v !== null ? `${v.toFixed(1)}x` : "—";
const formatPct = (v: number | null) => v !== null ? `${Math.round(v * 100)}%` : "—";
const formatR40 = (v: number | null) => v !== null ? Math.round(v).toString() : "—";

const CompanyScore = ({ score }: { score: CompanyScoreResult | null }) => {
  if (!score) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Investment Score</h3>
        </div>
        <AnimatedScoreRing score={score.overall} grade={score.grade} color={score.color} />
      </div>

      {/* Key valuation metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-md bg-muted/30 border border-border/30">
        {[
          { label: "EV/Revenue", value: formatMultiple(score.impliedMultiple) },
          { label: "EV/EBITDA", value: formatMultiple(score.evEbitda) },
          { label: "Fwd Multiple (2Y)", value: formatMultiple(score.forwardMultiple) },
          { label: "Rule of 40", value: formatR40(score.ruleOf40), highlight: score.ruleOf40 !== null && score.ruleOf40 >= 40 ? "text-success" : score.ruleOf40 !== null && score.ruleOf40 < 20 ? "text-destructive" : "text-foreground" },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
          >
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
            <p className={`text-xs font-mono font-medium ${m.highlight ?? "text-foreground"}`}>{m.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Sector benchmarks */}
      {(score.sectorMedianEvRevenue || score.sectorMedianEvEbitda) && (
        <div className="grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-md border border-border/50 bg-secondary/20">
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
        <AnimatedScoreBar label="ARR / Revenue Scale" value={score.arrScore} delay={0.1} />
        <AnimatedScoreBar label="Valuation (Sector-Adj)" value={score.valuationScore} delay={0.2} />
        <AnimatedScoreBar label="Growth Trajectory" value={score.growthScore} delay={0.3} />
        <AnimatedScoreBar label="Sector Momentum" value={score.sectorMomentum} delay={0.4} />
        <AnimatedScoreBar label="Operational Efficiency" value={score.efficiencyScore} delay={0.5} />
        <AnimatedScoreBar label="Capital Efficiency" value={score.capitalEfficiency} delay={0.6} />
      </div>
      {score.insights.length > 0 && (
        <div className="mt-3 space-y-1">
          {score.insights.map((insight, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="text-[10px] text-muted-foreground leading-relaxed"
            >
              • {insight}
            </motion.p>
          ))}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground/60 mt-2 border-t border-border pt-2">
        Weighted: Scale 18% · Valuation 22% · Growth 18% · Sector 12% · Efficiency 15% · Capital 15%
      </p>
    </motion.div>
  );
};

export default CompanyScore;
