import { useState, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Slider } from "@/components/ui/slider";
import { Save, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export interface SensitivityInputs {
  wacc: number;
  exitMultiple: number;
  revenueGrowth: number;
}

export interface SensitivityPanelProps {
  dealId?: string;
  companyId?: string;
  baseRevenue?: number; // $M
  baseEbitdaMargin?: number; // 0-100
  onChange?: (inputs: SensitivityInputs) => void;
}

const SCENARIO_META: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  bull: { label: "Bull Case", icon: TrendingUp, color: "text-success" },
  base: { label: "Base Case", icon: Minus, color: "text-primary" },
  bear: { label: "Bear Case", icon: TrendingDown, color: "text-destructive" },
};

const computeImpliedValuation = (
  revenue: number,
  ebitdaMargin: number,
  wacc: number,
  exitMultiple: number,
  revenueGrowth: number
): number => {
  if (revenue <= 0) return 0;
  const ebitda = revenue * (ebitdaMargin / 100);
  const projectionYears = 5;
  let totalPV = 0;
  let lastFcf = 0;
  for (let i = 1; i <= projectionYears; i++) {
    const projRev = revenue * Math.pow(1 + revenueGrowth / 100, i);
    const projEbitda = projRev * (ebitdaMargin / 100);
    const fcf = projEbitda * 0.75;
    totalPV += fcf / Math.pow(1 + wacc / 100, i);
    lastFcf = fcf;
  }
  const terminalValue = lastFcf * exitMultiple;
  const pvTerminal = terminalValue / Math.pow(1 + wacc / 100, projectionYears);
  return Math.round(totalPV + pvTerminal);
};

const SensitivityPanel = ({ dealId, companyId, baseRevenue = 100, baseEbitdaMargin = 25, onChange }: SensitivityPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [inputs, setInputs] = useState<SensitivityInputs>({
    wacc: 10,
    exitMultiple: 8,
    revenueGrowth: 15,
  });

  const impliedValuation = useMemo(
    () => computeImpliedValuation(baseRevenue, baseEbitdaMargin, inputs.wacc, inputs.exitMultiple, inputs.revenueGrowth),
    [baseRevenue, baseEbitdaMargin, inputs]
  );

  const handleChange = useCallback(
    (key: keyof SensitivityInputs, value: number) => {
      const next = { ...inputs, [key]: value };
      setInputs(next);
      onChange?.(next);
    },
    [inputs, onChange]
  );

  const [savingAs, setSavingAs] = useState<string | null>(null);

  const { data: savedScenarios } = useQuery({
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

  const saveScenario = useMutation({
    mutationFn: async (scenarioType: string) => {
      if (!user || !dealId) throw new Error("Missing context");
      setSavingAs(scenarioType);
      const payload = {
        deal_id: dealId,
        company_id: companyId ?? null,
        user_id: user.id,
        scenario_type: scenarioType,
        wacc: inputs.wacc,
        exit_multiple: inputs.exitMultiple,
        revenue_growth: inputs.revenueGrowth,
        implied_valuation: impliedValuation,
      };
      const { error } = await supabase
        .from("valuation_scenarios")
        .upsert(payload as any, { onConflict: "deal_id,user_id,scenario_type" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valuation-scenarios", dealId] });
      toast.success(`${SCENARIO_META[savingAs!]?.label ?? "Scenario"} saved`);
      setSavingAs(null);
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Failed to save");
      setSavingAs(null);
    },
  });

  const loadScenario = useCallback(
    (scenario: any) => {
      const next: SensitivityInputs = {
        wacc: Number(scenario.wacc),
        exitMultiple: Number(scenario.exit_multiple),
        revenueGrowth: Number(scenario.revenue_growth),
      };
      setInputs(next);
      onChange?.(next);
      toast.info(`Loaded ${SCENARIO_META[scenario.scenario_type]?.label}`);
    },
    [onChange]
  );

  const sliders = [
    { key: "wacc" as const, label: "WACC", min: 5, max: 20, step: 0.5, unit: "%", formatVal: (v: number) => `${v.toFixed(1)}%` },
    { key: "exitMultiple" as const, label: "Exit Multiple", min: 3, max: 20, step: 0.5, unit: "x", formatVal: (v: number) => `${v.toFixed(1)}x` },
    { key: "revenueGrowth" as const, label: "Revenue Growth", min: -10, max: 50, step: 1, unit: "%", formatVal: (v: number) => `${v.toFixed(0)}%` },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Dynamic Sensitivity Analysis</h3>
        <motion.div
          key={impliedValuation}
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-right"
        >
          <p className="text-[10px] text-muted-foreground">Implied Valuation</p>
          <p className="text-lg font-bold font-mono text-primary">${impliedValuation}M</p>
        </motion.div>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        {sliders.map((s) => (
          <div key={s.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <span className="text-xs font-mono font-semibold text-foreground">{s.formatVal(inputs[s.key])}</span>
            </div>
            <Slider
              min={s.min}
              max={s.max}
              step={s.step}
              value={[inputs[s.key]]}
              onValueChange={([v]) => handleChange(s.key, v)}
              className="w-full"
            />
            <div className="flex justify-between text-[9px] text-muted-foreground/60 font-mono">
              <span>{s.formatVal(s.min)}</span>
              <span>{s.formatVal(s.max)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Save Scenarios */}
      {dealId && user && (
        <div className="space-y-3 pt-2 border-t border-border">
          <p className="text-xs font-semibold text-foreground">Save Scenario</p>
          <div className="grid grid-cols-3 gap-2">
            {(["bull", "base", "bear"] as const).map((type) => {
              const meta = SCENARIO_META[type];
              const Icon = meta.icon;
              const saved = savedScenarios?.find((s: any) => s.scenario_type === type);
              const isSaving = saveScenario.isPending && savingAs === type;
              return (
                <button
                  key={type}
                  onClick={() => saveScenario.mutate(type)}
                  disabled={saveScenario.isPending}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-md border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className={`h-4 w-4 animate-spin ${meta.color}`} />
                  ) : (
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  )}
                  <span className="text-[10px] font-medium text-foreground">{meta.label}</span>
                  {saved && (
                    <span className="text-[8px] text-muted-foreground font-mono">${Number(saved.implied_valuation).toLocaleString()}M</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Load saved scenarios */}
          {savedScenarios && savedScenarios.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground">Saved Scenarios — click to load</p>
              <div className="space-y-1">
                {savedScenarios.map((s: any) => {
                  const meta = SCENARIO_META[s.scenario_type];
                  const Icon = meta?.icon ?? Minus;
                  return (
                    <button
                      key={s.id}
                      onClick={() => loadScenario(s)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-secondary/30 hover:bg-secondary/60 transition-colors text-xs"
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon className={`h-3 w-3 ${meta?.color}`} />
                        <span className="font-medium text-foreground">{meta?.label}</span>
                      </span>
                      <span className="flex items-center gap-3 font-mono text-muted-foreground">
                        <span>WACC {Number(s.wacc).toFixed(1)}%</span>
                        <span>{Number(s.exit_multiple).toFixed(1)}x</span>
                        <span>{Number(s.revenue_growth).toFixed(0)}% growth</span>
                        <span className="font-semibold text-foreground">${Number(s.implied_valuation).toLocaleString()}M</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SensitivityPanel;
export { computeImpliedValuation, SCENARIO_META };
