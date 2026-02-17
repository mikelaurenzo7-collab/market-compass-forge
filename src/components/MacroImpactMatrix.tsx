import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlphaSignals } from "@/hooks/useAlphaSignals";
import { useMacroIndicators } from "@/hooks/useMacroIndicators";
import { Activity, TrendingUp, TrendingDown, Minus, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AssetClassImpact {
  assetClass: string;
  direction: "bullish" | "bearish" | "neutral";
  magnitude: string;
  magnitudeNum: number;
  keyDriver: string;
  confidence: "high" | "medium" | "low";
  correlation: string;
}

const HeatCell = ({ value, max, index }: { value: number; max: number; index: number }) => {
  const intensity = Math.min(Math.abs(value) / max, 1);
  const isPositive = value >= 0;

  return (
    <motion.div
      className="w-full h-10 rounded-lg flex items-center justify-center relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 200 }}
      style={{
        backgroundColor: isPositive
          ? `hsl(var(--primary) / ${0.08 + intensity * 0.35})`
          : `hsl(var(--destructive) / ${0.08 + intensity * 0.35})`,
      }}
    >
      {/* Pulse overlay for high magnitude */}
      {intensity > 0.6 && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            backgroundColor: isPositive ? "hsl(var(--primary))" : "hsl(var(--destructive))",
          }}
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className={`text-xs font-mono font-bold relative z-10 ${isPositive ? "text-primary" : "text-destructive"}`}>
        {value >= 0 ? "+" : ""}{value.toFixed(0)}%
      </span>
    </motion.div>
  );
};

const MacroImpactMatrix = () => {
  const { data: alphaSignals } = useAlphaSignals();
  const { data: macroIndicators } = useMacroIndicators();
  const [showCorrelations, setShowCorrelations] = useState(false);

  const { impacts, macroSummary, bestOpportunity } = useMemo(() => {
    if (!macroIndicators?.length) return { impacts: [], macroSummary: null, bestOpportunity: null };

    const macroMap: Record<string, any> = {};
    macroIndicators.forEach(m => { if (!macroMap[m.series_id]) macroMap[m.series_id] = m; });

    const treasury = macroMap["DGS10"];
    const fedFunds = macroMap["FEDFUNDS"];
    const vix = macroMap["VIXCLS"];
    const hySpread = macroMap["BAMLH0A0HYM2"];
    const cpi = macroMap["CPIAUCSL"];

    const rateLevel = treasury?.value ?? 4.28;
    const isHighRates = rateLevel > 4.0;
    const isVolatile = (vix?.value ?? 15) > 20;
    const vixVal = vix?.value ?? 15;

    const sectorSignals = alphaSignals ?? [];
    const techSignal = sectorSignals.find(s => s.sector.toLowerCase().includes("saas") || s.sector.toLowerCase().includes("tech"));

    const peVcMag = isHighRates ? -(rateLevel * 0.8) : (5 - rateLevel) * 1.2;
    const distressedMag = isHighRates ? rateLevel * 1.5 : 0;
    const reMag = isHighRates ? -(rateLevel * 1.2) : (5 - rateLevel) * 2;
    const publicMag = isVolatile ? -(vixVal * 0.3) : (25 - vixVal) * 0.4;
    const globalMag = isHighRates ? -(rateLevel * 0.6) : (5 - rateLevel) * 1.5;

    const impactsList: AssetClassImpact[] = [
      { assetClass: "PE / VC", direction: isHighRates ? "bearish" : "bullish", magnitude: `${peVcMag >= 0 ? "+" : ""}${peVcMag.toFixed(0)}%`, magnitudeNum: peVcMag, keyDriver: `${rateLevel.toFixed(1)}% 10Y compresses multiples${techSignal ? `, ${techSignal.sector} ${techSignal.direction}` : ""}`, confidence: treasury ? "high" : "medium", correlation: "Inverse to rates. High correlation with VIX. Sector alpha signals amplify." },
      { assetClass: "Distressed", direction: isHighRates ? "bullish" : "neutral", magnitude: `${distressedMag >= 0 ? "+" : ""}${distressedMag.toFixed(0)}%`, magnitudeNum: distressedMag, keyDriver: `Rising rates create distressed supply${hySpread ? `, HY spread ${hySpread.value.toFixed(0)}bps` : ""}`, confidence: "high", correlation: "Positively correlated with rates + HY spreads. Counter-cyclical to PE/VC." },
      { assetClass: "Real Estate", direction: isHighRates ? "bearish" : "bullish", magnitude: `${reMag >= 0 ? "+" : ""}${reMag.toFixed(0)}%`, magnitudeNum: reMag, keyDriver: `Cap rate expansion at ${rateLevel.toFixed(1)}% 10Y, transaction volume ${isHighRates ? "declining" : "recovering"}`, confidence: treasury ? "high" : "medium", correlation: "Highly sensitive to 10Y. Lagging indicator vs PE. Sector-specific divergences." },
      { assetClass: "Public Markets", direction: isVolatile ? "bearish" : "bullish", magnitude: `${publicMag >= 0 ? "+" : ""}${publicMag.toFixed(0)}%`, magnitudeNum: publicMag, keyDriver: `VIX at ${vixVal.toFixed(0)}${fedFunds ? `, Fed Funds ${fedFunds.value.toFixed(2)}%` : ""}`, confidence: vix ? "high" : "low", correlation: "Leading indicator for PE multiples. VIX drives short-term, rates drive medium-term." },
      { assetClass: "Global / EM", direction: isHighRates ? "bearish" : "bullish", magnitude: `${globalMag >= 0 ? "+" : ""}${globalMag.toFixed(0)}%`, magnitudeNum: globalMag, keyDriver: `Strong USD from high rates compresses EM returns`, confidence: "medium", correlation: "USD-sensitive. Diverges from US PE when rates peak. Emerging sectors may decouple." },
    ];

    const macroSummaryText = `${isHighRates ? "Restrictive" : "Accommodative"} rate environment (10Y: ${rateLevel.toFixed(2)}%) with ${isVolatile ? "elevated" : "subdued"} volatility (VIX: ${vixVal.toFixed(0)})${cpi ? `, CPI: ${cpi.value.toFixed(1)}` : ""}.`;

    const sorted = [...impactsList].sort((a, b) => b.magnitudeNum - a.magnitudeNum);
    const best = sorted[0];

    return {
      impacts: impactsList,
      macroSummary: macroSummaryText,
      bestOpportunity: best ? `${best.assetClass} showing strongest signal at ${best.magnitude}` : null,
    };
  }, [alphaSignals, macroIndicators]);

  if (!impacts.length) return null;

  const maxMag = Math.max(...impacts.map(i => Math.abs(i.magnitudeNum)), 1);

  const DirectionIcon = ({ dir }: { dir: string }) => {
    if (dir === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-primary" />;
    if (dir === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <Card className="border-border bg-card overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Macro Impact Matrix</CardTitle>
          <span className="text-[9px] text-muted-foreground ml-auto font-mono">Macro-driven cross-asset correlation</span>
        </div>
        {macroSummary && (
          <p className="text-[11px] text-muted-foreground mt-1">{macroSummary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {bestOpportunity && (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 p-2.5 rounded-md bg-primary/5 border border-primary/15"
          >
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-primary">Opportunity Radar</p>
              <p className="text-[10px] text-muted-foreground">{bestOpportunity}</p>
            </div>
          </motion.div>
        )}

        {/* Heat map with animated cells */}
        <div className="grid grid-cols-5 gap-2">
          {impacts.map((row, i) => (
            <div key={row.assetClass} className="text-center space-y-1.5">
              <p className="text-[10px] font-medium text-foreground truncate">{row.assetClass}</p>
              <HeatCell value={row.magnitudeNum} max={maxMag} index={i} />
              <div className="flex items-center justify-center gap-1">
                <DirectionIcon dir={row.direction} />
                <span className={`text-[9px] font-medium capitalize ${
                  row.direction === "bullish" ? "text-primary" :
                  row.direction === "bearish" ? "text-destructive" :
                  "text-muted-foreground"
                }`}>
                  {row.direction}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Asset Class</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Key Driver</th>
                <th className="text-center py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {impacts.map((row, i) => (
                <motion.tr
                  key={row.assetClass}
                  className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <td className="py-2.5 px-3 text-xs font-medium text-foreground">{row.assetClass}</td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground">{row.keyDriver}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      row.confidence === "high" ? "bg-primary/10 text-primary" :
                      row.confidence === "medium" ? "bg-accent text-accent-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {row.confidence}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => setShowCorrelations(!showCorrelations)}
          className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showCorrelations ? "Hide" : "Show"} cross-asset correlations
          {showCorrelations ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <AnimatePresence>
          {showCorrelations && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 overflow-hidden"
            >
              {impacts.map((row) => (
                <div key={row.assetClass} className="rounded-md bg-secondary/30 p-2.5">
                  <p className="text-[10px] font-medium text-foreground">{row.assetClass}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{row.correlation}</p>
                </div>
              ))}
              <p className="text-[9px] text-muted-foreground italic">
                "Rising rates compress PE multiples but create distressed opportunities — the best investors rotate, not retreat."
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[9px] text-muted-foreground">
          Cross-asset correlations derived from macro indicators and AI sector signals · Updated in real-time
        </p>
      </CardContent>
    </Card>
  );
};

export default MacroImpactMatrix;
