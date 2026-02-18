import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, TrendingDown, Minus, Scale } from "lucide-react";
import { motion } from "framer-motion";

const SCENARIO_META: Record<string, { label: string; icon: typeof TrendingUp; color: string; bgColor: string }> = {
  bull: { label: "Bull", icon: TrendingUp, color: "text-success", bgColor: "bg-success/10 border-success/20" },
  base: { label: "Base", icon: Minus, color: "text-primary", bgColor: "bg-primary/10 border-primary/20" },
  bear: { label: "Bear", icon: TrendingDown, color: "text-destructive", bgColor: "bg-destructive/10 border-destructive/20" },
};

const ValuationRangesSection = ({ dealId }: { dealId?: string }) => {
  const { user } = useAuth();

  const { data: scenarios } = useQuery({
    queryKey: ["valuation-scenarios", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("valuation_scenarios")
        .select("*")
        .eq("deal_id", dealId!)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!dealId && !!user,
  });

  if (!scenarios || scenarios.length === 0) return null;

  const vals = scenarios.map((s: any) => Number(s.implied_valuation));
  const minVal = Math.min(...vals);
  const maxVal = Math.max(...vals);
  const range = maxVal - minVal || 1;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Scale className="h-3.5 w-3.5 text-primary" /> Valuation Ranges
      </h3>

      {/* Mini football field */}
      <div className="relative h-8 rounded-md bg-muted/20 overflow-hidden">
        {scenarios.map((s: any, i: number) => {
          const meta = SCENARIO_META[s.scenario_type];
          if (!meta) return null;
          const val = Number(s.implied_valuation);
          const pct = ((val - minVal) / range) * 80 + 10; // 10-90% range
          return (
            <motion.div
              key={s.id}
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
              style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className={`h-full w-0.5 ${meta.color.replace("text-", "bg-")}`} />
              <span className={`absolute -top-4 text-[8px] font-mono font-semibold ${meta.color}`}>
                ${val.toLocaleString()}M
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-2">
        {(["bear", "base", "bull"] as const).map((type) => {
          const s = scenarios.find((sc: any) => sc.scenario_type === type);
          const meta = SCENARIO_META[type];
          const Icon = meta.icon;
          if (!s) return (
            <div key={type} className="rounded-md border border-dashed border-border p-2 text-center">
              <Icon className={`h-3 w-3 mx-auto ${meta.color} opacity-40`} />
              <p className="text-[9px] text-muted-foreground mt-0.5">{meta.label} — not set</p>
            </div>
          );
          return (
            <div key={type} className={`rounded-md border p-2 text-center ${meta.bgColor}`}>
              <Icon className={`h-3 w-3 mx-auto ${meta.color}`} />
              <p className="text-xs font-mono font-bold text-foreground mt-0.5">${Number(s.implied_valuation).toLocaleString()}M</p>
              <div className="text-[8px] text-muted-foreground mt-0.5 space-x-1.5">
                <span>WACC {Number(s.wacc).toFixed(1)}%</span>
                <span>{Number(s.exit_multiple).toFixed(1)}x</span>
                <span>{Number(s.revenue_growth).toFixed(0)}%g</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ValuationRangesSection;
