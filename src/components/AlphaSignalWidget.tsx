import { useAlphaSignals, useGenerateAlphaSignals, AlphaSignal } from "@/hooks/useAlphaSignals";
import { useMacroIndicators } from "@/hooks/useMacroIndicators";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, Zap, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const DirectionIcon = ({ direction }: { direction: string }) => {
  if (direction === "bullish") return <TrendingUp className="h-4 w-4 text-[hsl(var(--success))]" />;
  if (direction === "bearish") return <TrendingDown className="h-4 w-4 text-[hsl(var(--destructive))]" />;
  return <Minus className="h-4 w-4 text-[hsl(var(--warning))]" />;
};

const ConfidenceDot = ({ level }: { level: string }) => {
  const color =
    level === "high" ? "bg-[hsl(var(--success))]" :
    level === "medium" ? "bg-[hsl(var(--warning))]" :
    "bg-muted-foreground";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
};

const MagnitudeBar = ({ value, direction }: { value: number; direction: string }) => {
  const width = Math.min(Math.abs(value) * 5, 100);
  const color = direction === "bullish" ? "from-success/80 to-success/30" : direction === "bearish" ? "from-destructive/80 to-destructive/30" : "from-warning/80 to-warning/30";
  return (
    <div className="h-1 w-16 rounded-full bg-secondary/50 overflow-hidden">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
};

const MacroBar = () => {
  const { data: macros, isLoading } = useMacroIndicators();

  if (isLoading || !macros?.length) {
    return (
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Macro</span>
        <span className="text-xs text-muted-foreground">No macro data seeded yet</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border bg-muted/20 overflow-x-auto">
      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider shrink-0">Macro</span>
      {macros.map((m, i) => (
        <motion.div
          key={m.series_id}
          className="flex items-center gap-1.5 shrink-0"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))] animate-pulse-slow" />
          <span className="text-[11px] font-mono text-muted-foreground">{m.label}:</span>
          <span className="text-[11px] font-mono font-semibold text-foreground">
            {m.value}{m.unit === "percent" ? "%" : ""}
          </span>
        </motion.div>
      ))}
      <span className="text-[9px] font-mono text-muted-foreground ml-auto shrink-0">DELAYED</span>
    </div>
  );
};

const SignalCard = ({ signal, index }: { signal: AlphaSignal; index: number }) => {
  const magnitude = signal.magnitude_pct;
  const dirColor =
    signal.direction === "bullish" ? "text-[hsl(var(--success))]" :
    signal.direction === "bearish" ? "text-[hsl(var(--destructive))]" :
    "text-[hsl(var(--warning))]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <DirectionIcon direction={signal.direction} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground truncate">{signal.sector}</span>
              <ConfidenceDot level={signal.confidence} />
              <span className="text-[10px] font-mono text-muted-foreground capitalize">{signal.confidence}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{signal.reasoning}</p>
            <div className="mt-1.5">
              <MagnitudeBar value={magnitude ?? 0} direction={signal.direction} />
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <motion.span
            className={`text-lg font-mono font-bold ${dirColor}`}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.08 + 0.2, type: "spring", stiffness: 150 }}
          >
            {magnitude && magnitude > 0 ? "+" : ""}{magnitude?.toFixed(1)}%
          </motion.span>
          <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
            {formatDistanceToNow(new Date(signal.generated_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const AlphaSignalWidget = () => {
  const { data: signals, isLoading } = useAlphaSignals();
  const generate = useGenerateAlphaSignals();

  // Summary stats
  const bullishCount = signals?.filter(s => s.direction === "bullish").length ?? 0;
  const bearishCount = signals?.filter(s => s.direction === "bearish").length ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Alpha Signals</h3>
          <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4 border-primary/30 text-primary">
            AI
          </Badge>
          {signals && signals.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[9px] font-mono text-success">{bullishCount}↑</span>
              <span className="text-[9px] font-mono text-destructive">{bearishCount}↓</span>
            </div>
          )}
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="h-7 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
        >
          {generate.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Generate
        </button>
      </div>

      <MacroBar />

      {isLoading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : !signals?.length ? (
        <div className="p-6 text-center space-y-2">
          <Zap className="h-6 w-6 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No signals yet</p>
          <p className="text-xs text-muted-foreground">
            Click "Generate" to run the AI inference engine against your market data.
          </p>
        </div>
      ) : (
        <div>
          {signals.map((s, i) => (
            <SignalCard key={s.id} signal={s} index={i} />
          ))}
          <div className="px-4 py-2 bg-muted/10 border-t border-border/50">
            <p className="text-[9px] font-mono text-muted-foreground text-center">
              AI-GENERATED · NOT INVESTMENT ADVICE · {signals[0]?.model_used?.split("/")[1]?.toUpperCase() ?? "GEMINI"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlphaSignalWidget;
