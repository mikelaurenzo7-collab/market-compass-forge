import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlphaSignals } from "@/hooks/useAlphaSignals";
import { useMacroIndicators } from "@/hooks/useMacroIndicators";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface AssetClassImpact {
  assetClass: string;
  direction: "bullish" | "bearish" | "neutral";
  magnitude: string;
  keyDriver: string;
  confidence: "high" | "medium" | "low";
}

const MacroImpactMatrix = () => {
  const { data: alphaSignals } = useAlphaSignals();
  const { data: macroIndicators } = useMacroIndicators();

  const impacts = useMemo((): AssetClassImpact[] => {
    if (!macroIndicators?.length) return [];

    const treasury = macroIndicators.find(m => m.series_id === "DGS10");
    const fedFunds = macroIndicators.find(m => m.series_id === "FEDFUNDS");
    const vix = macroIndicators.find(m => m.series_id === "VIXCLS");
    const hySpread = macroIndicators.find(m => m.series_id === "BAMLH0A0HYM2");

    const rateLevel = treasury?.value ?? 4.28;
    const isHighRates = rateLevel > 4.0;
    const isVolatile = (vix?.value ?? 15) > 20;

    // Derive cross-asset impacts from macro regime
    const sectorSignals = alphaSignals ?? [];
    const techSignal = sectorSignals.find(s => s.sector.toLowerCase().includes("saas") || s.sector.toLowerCase().includes("tech"));
    const healthSignal = sectorSignals.find(s => s.sector.toLowerCase().includes("health"));

    return [
      {
        assetClass: "PE / VC",
        direction: isHighRates ? "bearish" : "bullish",
        magnitude: isHighRates ? `-${(rateLevel * 0.8).toFixed(0)}%` : `+${((5 - rateLevel) * 1.2).toFixed(0)}%`,
        keyDriver: `${rateLevel.toFixed(1)}% 10Y compresses multiples${techSignal ? `, ${techSignal.sector} ${techSignal.direction}` : ""}`,
        confidence: treasury ? "high" : "medium",
      },
      {
        assetClass: "Distressed",
        direction: isHighRates ? "bullish" : "neutral",
        magnitude: isHighRates ? `+${(rateLevel * 1.5).toFixed(0)}%` : "Flat",
        keyDriver: `Rising rates create distressed supply${hySpread ? `, HY spread ${hySpread.value.toFixed(0)}bps` : ""}`,
        confidence: "high",
      },
      {
        assetClass: "Real Estate",
        direction: isHighRates ? "bearish" : "bullish",
        magnitude: isHighRates ? `-${(rateLevel * 1.2).toFixed(0)}%` : `+${((5 - rateLevel) * 2).toFixed(0)}%`,
        keyDriver: `Cap rate expansion at ${rateLevel.toFixed(1)}% 10Y, transaction volume ${isHighRates ? "declining" : "recovering"}`,
        confidence: treasury ? "high" : "medium",
      },
      {
        assetClass: "Public Markets",
        direction: isVolatile ? "bearish" : "bullish",
        magnitude: isVolatile ? `-${((vix?.value ?? 20) * 0.3).toFixed(0)}%` : `+${((25 - (vix?.value ?? 15)) * 0.4).toFixed(0)}%`,
        keyDriver: `VIX at ${(vix?.value ?? 15).toFixed(0)}${fedFunds ? `, Fed Funds ${fedFunds.value.toFixed(2)}%` : ""}`,
        confidence: vix ? "high" : "low",
      },
      {
        assetClass: "Global / EM",
        direction: isHighRates ? "bearish" : "bullish",
        magnitude: isHighRates ? `-${(rateLevel * 0.6).toFixed(0)}%` : `+${((5 - rateLevel) * 1.5).toFixed(0)}%`,
        keyDriver: `Strong USD from high rates compresses EM returns${healthSignal ? `, Healthcare ${healthSignal.direction}` : ""}`,
        confidence: "medium",
      },
    ];
  }, [alphaSignals, macroIndicators]);

  if (!impacts.length) return null;

  const DirectionIcon = ({ dir }: { dir: string }) => {
    if (dir === "bullish") return <TrendingUp className="h-3.5 w-3.5 text-primary" />;
    if (dir === "bearish") return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">Macro Impact Matrix</CardTitle>
          <span className="text-[9px] text-muted-foreground ml-auto font-mono">AI-powered cross-asset view</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Asset Class</th>
                <th className="text-center py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Direction</th>
                <th className="text-right py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Magnitude</th>
                <th className="text-left py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Key Driver</th>
                <th className="text-center py-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {impacts.map((row) => (
                <tr key={row.assetClass} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-2.5 px-3 text-xs font-medium text-foreground">{row.assetClass}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <DirectionIcon dir={row.direction} />
                      <span className={`text-xs font-medium capitalize ${
                        row.direction === "bullish" ? "text-primary" :
                        row.direction === "bearish" ? "text-destructive" :
                        "text-muted-foreground"
                      }`}>
                        {row.direction}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`text-xs font-mono font-medium ${
                      row.magnitude.startsWith("+") ? "text-primary" :
                      row.magnitude.startsWith("-") ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      {row.magnitude}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-muted-foreground max-w-[200px] truncate">{row.keyDriver}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      row.confidence === "high" ? "bg-primary/10 text-primary" :
                      row.confidence === "medium" ? "bg-accent text-accent-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {row.confidence}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[9px] text-muted-foreground mt-3">
          Cross-asset correlations derived from macro indicators and AI sector signals. "Rising rates compress PE multiples but create distressed opportunities."
        </p>
      </CardContent>
    </Card>
  );
};

export default MacroImpactMatrix;
